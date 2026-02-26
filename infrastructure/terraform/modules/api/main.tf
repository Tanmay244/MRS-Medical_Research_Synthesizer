variable "app_name" {
  type = string
}

variable "lambda_package_path" {
  type = string
}

variable "s3_bucket_arn" {
  type = string
}

variable "lambda_role_arn" {
  type = string
  default = null
}

resource "aws_lambda_function" "api" {
  function_name = "${var.app_name}-lambda"
  role          = var.lambda_role_arn
  handler       = "app.main.app"
  runtime       = "python3.11"

  filename         = var.lambda_package_path
  source_code_hash = filebase64sha256(var.lambda_package_path)

  environment {
    variables = {
      S3_BUCKET         = var.s3_bucket_arn
      VECTOR_STORE_PATH = "/tmp/vector_store.json"
    }
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.app_name}-http"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                = aws_apigatewayv2_api.http.id
  integration_type      = "AWS_PROXY"
  integration_uri       = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

