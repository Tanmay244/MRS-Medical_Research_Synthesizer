from app.core.config import Settings


def test_settings_defaults():
    settings = Settings()
    assert settings.app_name
    assert settings.aws_region == "us-east-1"

