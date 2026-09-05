# Interview Tab Basic Test
# Tests core functionality

$baseUrl = "http://127.0.0.1:8000/api"

Write-Host "Testing Interview Endpoints..."
Write-Host ""

# Test 1: HR Questions
Write-Host "Test 1: HR Questions"
try {
    $hr = Invoke-WebRequest -Uri "$baseUrl/interview/hr" -UseBasicParsing | ConvertFrom-Json
    Write-Host "  - HR Count: $($hr.Count)"
} catch {
    Write-Host "  - ERROR: $_"
}

# Test 2: Technical Categories
Write-Host ""
Write-Host "Test 2: Technical Categories"
try {
    $tech = Invoke-WebRequest -Uri "$baseUrl/interview/technical" -UseBasicParsing | ConvertFrom-Json
    $cats = $tech | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name
    Write-Host "  - Category Count: $($cats.Count)"
    Write-Host "  - Has Go: $($cats -contains 'Go')"
    Write-Host "  - Has API: $($cats -contains 'API')"
} catch {
    Write-Host "  - ERROR: $_"
}

# Test 3: Catalog
Write-Host ""
Write-Host "Test 3: Interview Catalog"
try {
    $cat = Invoke-WebRequest -Uri "$baseUrl/interview/catalog" -UseBasicParsing | ConvertFrom-Json
    Write-Host "  - Categories: $($cat.categories.Count)"
    Write-Host "  - Difficulties: $($cat.difficulties -join ', ')"
} catch {
    Write-Host "  - ERROR: $_"
}

# Test 4: Questions for API/Basic
Write-Host ""
Write-Host "Test 4: API Basic Questions"
try {
    $q = Invoke-WebRequest -Uri "$baseUrl/interview/questions?category=API&difficulty=Basic" -UseBasicParsing | ConvertFrom-Json
    Write-Host "  - API Basic Count: $($q.questions.Count)"
    Write-Host "  - Source: $($q.source)"
} catch {
    Write-Host "  - ERROR: $_"
}

# Test 5: Interview Page
Write-Host ""
Write-Host "Test 5: Interview Page Load"
try {
    $page = Invoke-WebRequest -Uri "http://127.0.0.1:8000/interview.html" -UseBasicParsing
    Write-Host "  - Page Status: $($page.StatusCode)"
    Write-Host "  - Has interview.js: $($page.Content -match 'interview\.js')"
} catch {
    Write-Host "  - ERROR: $_"
}

# Test 6: Auth on AI Endpoints
Write-Host ""
Write-Host "Test 6: Authentication Required on AI Endpoints"
try {
    $eval = Invoke-WebRequest -Uri "$baseUrl/interview/evaluate" -Method Post `
        -Body '{"question":"test","answer":"test"}' -ContentType "application/json" `
        -UseBasicParsing -ErrorAction Stop
    Write-Host "  - ERROR: Auth NOT enforced!"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  - OK: Auth properly enforced (401)"
    } else {
        Write-Host "  - Response: $($_.Exception.Response.StatusCode)"
    }
}

Write-Host ""
Write-Host "Tests Complete!"
