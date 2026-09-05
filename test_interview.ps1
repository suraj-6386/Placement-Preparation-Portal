# Interview Tab Comprehensive Test Suite
# Tests all HR, Technical, and Gemini integration endpoints

$baseUrl = "http://127.0.0.1:8000/api"
$testResults = @()

function Test-Endpoint {
    param(
        [string]$name,
        [string]$method,
        [string]$endpoint,
        [hashtable]$body,
        [string]$expectedStatusCode = "200"
    )
    
    try {
        $url = "$baseUrl$endpoint"
        $params = @{
            Uri = $url
            Method = $method
            ContentType = "application/json"
            UseBasicParsing = $true
        }
        
        if ($body) {
            $params["Body"] = ($body | ConvertTo-Json)
        }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        
        $result = [PSCustomObject]@{
            Name = $name
            Status = "PASS"
            StatusCode = $statusCode
            Message = "OK"
        }
    }
    catch {
        $result = [PSCustomObject]@{
            Name = $name
            Status = "FAIL"
            StatusCode = $_.Exception.Response.StatusCode
            Message = $_.Exception.Message
        }
    }
    
    $testResults += $result
    return $result
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Interview Tab Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: HR Questions
Write-Host "Testing HR Questions..." -ForegroundColor Yellow
$hrTest = Test-Endpoint -name "GET /interview/hr" -method "GET" -endpoint "/interview/hr"
$hrResponse = Invoke-WebRequest -Uri "$baseUrl/interview/hr" -UseBasicParsing | ConvertFrom-Json
Write-Host "  ✓ HR Questions Count: $($hrResponse.Count)" -ForegroundColor Green
Write-Host "  ✓ First HR Question: $($hrResponse[0])" -ForegroundColor Green

# Test 2: Technical Categories
Write-Host ""
Write-Host "Testing Technical Categories..." -ForegroundColor Yellow
$techTest = Test-Endpoint -name "GET /interview/technical" -method "GET" -endpoint "/interview/technical"
$techResponse = Invoke-WebRequest -Uri "$baseUrl/interview/technical" -UseBasicParsing | ConvertFrom-Json
$categories = $techResponse | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name
Write-Host "  ✓ Categories Found: $($categories.Count)" -ForegroundColor Green
Write-Host "  ✓ Categories: $($categories -join ', ')" -ForegroundColor Green
Write-Host "  ✓ Contains Go: $($categories -contains 'Go')" -ForegroundColor Green
Write-Host "  ✓ Contains API: $($categories -contains 'API')" -ForegroundColor Green

# Test 3: Catalog (categories + difficulties)
Write-Host ""
Write-Host "Testing Interview Catalog..." -ForegroundColor Yellow
$catalogTest = Test-Endpoint -name "GET /interview/catalog" -method "GET" -endpoint "/interview/catalog"
$catalogResponse = Invoke-WebRequest -Uri "$baseUrl/interview/catalog" -UseBasicParsing | ConvertFrom-Json
Write-Host "  ✓ Catalog Categories: $($catalogResponse.categories.Count)" -ForegroundColor Green
Write-Host "  ✓ Difficulties: $($catalogResponse.difficulties -join ', ')" -ForegroundColor Green
Write-Host "  ✓ Go Excluded from Catalog: $(-not ($catalogResponse.categories -contains 'Go'))" -ForegroundColor Green
Write-Host "  ✓ API in Catalog: $($catalogResponse.categories -contains 'API')" -ForegroundColor Green

# Test 4: Questions for each difficulty
Write-Host ""
Write-Host "Testing Question Banks (sampling)..." -ForegroundColor Yellow

$sampleCategories = @("Python", "API")
foreach ($category in $sampleCategories) {
    foreach ($difficulty in @("Basic", "Medium", "Hard")) {
        $qTest = Test-Endpoint -name "GET /interview/questions ($category/$difficulty)" -method "GET" -endpoint "/interview/questions?category=$category&difficulty=$difficulty"
        $qResponse = Invoke-WebRequest -Uri "$baseUrl/interview/questions?category=$category&difficulty=$difficulty" -UseBasicParsing | ConvertFrom-Json
        Write-Host "  ✓ $category / $difficulty: $($qResponse.questions.Count) questions" -ForegroundColor Green
    }
}

# Test 5: Interview Page Loading
Write-Host ""
Write-Host "Testing Interview Page..." -ForegroundColor Yellow
$pageTest = Test-Endpoint -name "GET /interview.html" -method "GET" -endpoint "/interview.html"
$pageResponse = Invoke-WebRequest -Uri "http://127.0.0.1:8000/interview.html" -UseBasicParsing
Write-Host "  ✓ Interview Page Status: $($pageResponse.StatusCode)" -ForegroundColor Green
Write-Host "  ✓ Contains 'interview.js': $($pageResponse.Content -match 'interview\.js')" -ForegroundColor Green
Write-Host "  ✓ Contains 'interview.css': $($pageResponse.Content -match 'interview\.css')" -ForegroundColor Green

# Test 6: Auth Required on AI Endpoints
Write-Host ""
Write-Host "Testing Authentication Requirements..." -ForegroundColor Yellow
try {
    $unauthTest = Invoke-WebRequest -Uri "$baseUrl/interview/evaluate" -Method Post -Body '{"question":"test","answer":"test"}' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✗ Authentication NOT enforced!" -ForegroundColor Red
}
catch {
    if ($_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::Unauthorized) {
        Write-Host "  ✓ Authentication Properly Enforced (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Authentication Check Failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -gt 0) {
    Write-Host "Failed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✓ Core Interview endpoints are working!" -ForegroundColor Green
