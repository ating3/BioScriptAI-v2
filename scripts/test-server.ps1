# PowerShell script to test the LLM server

Write-Host "Testing health endpoint..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    Write-Host "✓ Health check: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nTesting chat endpoint..." -ForegroundColor Cyan
$body = @{
    messages = @(
        @{
            role = "user"
            content = "Hello! Say 'Hi' back in one word."
        }
    )
    max_tokens = 50
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/chat" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✓ Chat response:" -ForegroundColor Green
    Write-Host $response.choices[0].message.content -ForegroundColor Yellow
    Write-Host "`nUsage: $($response.usage.total_tokens) tokens" -ForegroundColor Gray
} catch {
    Write-Host "✗ Chat test failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response -ForegroundColor Red
}
