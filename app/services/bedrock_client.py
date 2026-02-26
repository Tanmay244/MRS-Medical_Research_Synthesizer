"""AWS Bedrock client abstraction with retry logic and instrumentation."""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, Iterable, Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class BedrockClient:
    """Wrapper around boto3 Bedrock runtime APIs."""

    def __init__(
        self,
        region_name: Optional[str] = None,
        max_retries: int = 3,
        backoff_factor: float = 0.5,
    ) -> None:
        region = region_name or settings.aws_region
        config = Config(region_name=region, retries={"max_attempts": max_retries})

        session = boto3.Session(
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            aws_session_token=settings.aws_session_token,
            region_name=region,
        )

        self._client = session.client("bedrock-runtime", config=config)
        self._max_retries = max_retries
        self._backoff_factor = backoff_factor

    def invoke_text_model(
        self,
        model_id: str,
        prompt: str,
        temperature: float,
        max_tokens: int,
        system_prompt: Optional[str] = None,
        stop_sequences: Optional[Iterable[str]] = None,
    ) -> Dict[str, Any]:
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "input": prompt,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if system_prompt:
            payload["system"] = system_prompt
        if stop_sequences:
            payload["stop_sequences"] = list(stop_sequences)

        return self._invoke(model_id, payload)

    def invoke_embedding_model(self, model_id: str, inputs: Iterable[str]) -> Dict[str, Any]:
        payload = {"inputText": list(inputs)}
        return self._invoke(model_id, payload)

    def _invoke(self, model_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        for attempt in range(1, self._max_retries + 1):
            try:
                response = self._client.invoke_model(
                    modelId=model_id,
                    body=json.dumps(payload).encode("utf-8"),
                    contentType="application/json",
                    accept="application/json",
                )
                body = response.get("body")
                if hasattr(body, "read"):
                    parsed = json.loads(body.read())
                else:
                    parsed = json.loads(body)
                return parsed
            except (BotoCoreError, ClientError) as exc:
                logger.warning(
                    "Bedrock invocation failed on attempt %s/%s: %s",
                    attempt,
                    self._max_retries,
                    exc,
                )
                if attempt >= self._max_retries:
                    raise
                sleep_time = self._backoff_factor * (2 ** (attempt - 1))
                time.sleep(sleep_time)

        raise RuntimeError("Bedrock invocation failed after maximum retries")

    def health_check(self) -> bool:
        if hasattr(self._client, "get_model"):
            try:
                self._client.get_model(modelId=settings.bedrock_model_id)
            except (BotoCoreError, ClientError) as exc:  # pragma: no cover - external call
                logger.error("Bedrock health check failed: %s", exc)
                return False
        else:
            logger.debug("Bedrock client does not expose get_model; skipping health check.")
        return True

