/**
 * 코팅 설비 생산일지 대시보드 - 자바스크립트 파일
 * 외부 라이브러리 없이 순수 JavaScript(Vanilla JS)로 구현되었습니다.
 */

// DOM 요소 참조 취득
const csvFileInput = document.getElementById('csvFileInput');
const fileNameDisplay = document.getElementById('fileName');

// 1. 파일 선택 이벤트 리스너 등록
csvFileInput.addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  // 선택한 파일 이름 표시
  fileNameDisplay.textContent = file.name;

  // FileReader API를 활용하여 CSV 파일 텍스트로 읽기
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    
    // CSV 데이터 파싱 실행
    const parsedData = parseCSV(text);
    
    if (parsedData.length === 0) {
      alert("CSV 파일에 유효한 데이터가 없거나 형식이 올바르지 않습니다.");
      return;
    }

    // 대시보드 컴포넌트 갱신
    renderDashboard(parsedData);
  };

  reader.readAsText(file, 'UTF-8'); // 한글 깨짐 방지를 위한 UTF-8 인코딩 지정
});

/**
 * 2. CSV 텍스트 데이터를 파싱하여 객체 배열로 변환하는 함수
 * @param {string} csvText - FileReader로 읽은 CSV 문자열
 * @returns {Array<Object>} 각 행을 키-값 객체로 변환한 배열
 */
function parseCSV(csvText) {
  // 줄바꿈 문자 기준으로 분할 (CRLF / LF 대응)
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // 첫 번째 행은 헤더(컬럼명)로 사용
  const headers = lines[0].split(',').map(header => header.trim());
  const result = [];

  // 두 번째 행부터 데이터 바인딩
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].split(',').map(cell => cell.trim());
    if (currentLine.length === headers.length) {
      const rowObject = {};
      headers.forEach((header, index) => {
        rowObject[header] = currentLine[index];
      });
      result.push(rowObject);
    }
  }

  return result;
}

/**
 * 3. 전체 대시보드 화면을 그리는 메인 컨트롤러 함수
 * @param {Array<Object>} data - 파싱된 생산일지 데이터
 */
function renderDashboard(data) {
  renderSummaryCards(data);
  renderFacilityChart(data);
  renderDailyChart(data);
  renderDataTable(data);
}

/**
 * 4. 요약 카드 계산 및 렌더링
 *  - 총 롤 수, 불량률(%), 가동률(%), 총 로스시간
 *  - 가동률 = 생산시간 합계 / (생산시간+로스시간 합계) x 100
 */
function renderSummaryCards(data) {
  const totalRolls = data.length;

  let ngCount = 0;
  let totalProductionTime = 0;
  let totalLossTime = 0;

  data.forEach(row => {
    // 불량 수 판정 (판정, NG/OK 컬럼 등 유연하게 검색)
    const status = row['판정'] || row['불량판정'] || row['상태'] || '';
    if (status.toUpperCase() === 'NG') {
      ngCount++;
    }

    // 생산시간, 로스시간 계산 (숫자 변환 처리)
    const prodTime = parseFloat(row['생산시간'] || row['생산시간(분)'] || row['생산시간(분)'] || 0) || 0;
    const lossTime = parseFloat(row['로스시간'] || row['로스시간(분)'] || row['로스시간(분)'] || 0) || 0;

    totalProductionTime += prodTime;
    totalLossTime += lossTime;
  });

  // 불량률 계산
  const defectRate = totalRolls > 0 ? (ngCount / totalRolls) * 100 : 0;

  // 가동률 계산 (생산시간 / (생산시간 + 로스시간) * 100)
  const totalOperatingTime = totalProductionTime + totalLossTime;
  const operatingRate = totalOperatingTime > 0 ? (totalProductionTime / totalOperatingTime) * 100 : 0;

  // 화면 출력 (소수점 첫째 자리까지 표시 .toFixed(1))
  document.getElementById('totalRolls').textContent = `${totalRolls.toLocaleString()} 롤`;
  document.getElementById('defectRate').textContent = `${defectRate.toFixed(1)} %`;
  document.getElementById('operatingRate').textContent = `${operatingRate.toFixed(1)} %`;
  document.getElementById('totalLossTime').textContent = `${totalLossTime.toFixed(1)} 분`;
}

/**
 * 5. 설비별 생산 롤 수 가로 막대 차트 생성 (많은순)
 */
function renderFacilityChart(data) {
  const facilityCountMap = {};

  // 설비별 롤 수 집계
  data.forEach(row => {
    const facility = row['설비'] || row['설비명'] || row['호기'] || '미지정';
    facilityCountMap[facility] = (facilityCountMap[facility] || 0) + 1;
  });

  // 배열 전환 후 많은순(내림차순) 정렬
  const sortedFacilities = Object.entries(facilityCountMap)
    .map(([key, value]) => ({ label: key, value }))
    .sort((a, b) => b.value - a.value);

  // 최고값 기준 백분율 계산을 위한 max값 도출
  const maxValue = sortedFacilities.length > 0 ? sortedFacilities[0].value : 1;

  // HTML 동적 생성
  const container = document.getElementById('facilityChart');
  container.innerHTML = '';

  sortedFacilities.forEach(item => {
    const widthPercent = ((item.value / maxValue) * 100).toFixed(1);
    
    const rowDiv = document.createElement('div');
    rowDiv.className = 'bar-row';
    rowDiv.innerHTML = `
      <div class="bar-label" title="${item.label}">${item.label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${widthPercent}%;"></div>
      </div>
      <div class="bar-value">${item.value.toFixed(1)}</div>
    `;
    container.appendChild(rowDiv);
  });
}

/**
 * 6. 일자별 생산 롤 수 가로 막대 차트 생성 (날짜순)
 */
function renderDailyChart(data) {
  const dailyCountMap = {};

  // 일자별 롤 수 집계
  data.forEach(row => {
    const date = row['일자'] || row['생산일자'] || row['날짜'] || '미지정';
    dailyCountMap[date] = (dailyCountMap[date] || 0) + 1;
  });

  // 배열 전환 후 날짜순(오름차순) 정렬
  const sortedDates = Object.entries(dailyCountMap)
    .map(([key, value]) => ({ label: key, value }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // 최고값 도출
  const maxValue = Math.max(...sortedDates.map(item => item.value), 1);

  // HTML 동적 생성
  const container = document.getElementById('dailyChart');
  container.innerHTML = '';

  sortedDates.forEach(item => {
    const widthPercent = ((item.value / maxValue) * 100).toFixed(1);

    const rowDiv = document.createElement('div');
    rowDiv.className = 'bar-row';
    rowDiv.innerHTML = `
      <div class="bar-label" title="${item.label}">${item.label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${widthPercent}%;"></div>
      </div>
      <div class="bar-value">${item.value.toFixed(1)}</div>
    `;
    container.appendChild(rowDiv);
  });
}

/**
 * 7. 전체 롤 표(Table) 렌더링
 *  - 판정이 'NG'인 행은 .ng-row 클래스를 통해 배경색 강조
 */
function renderDataTable(data) {
  const tableHeader = document.getElementById('tableHeader');
  const tableBody = document.getElementById('tableBody');

  tableHeader.innerHTML = '';
  tableBody.innerHTML = '';

  if (data.length === 0) return;

  // 테이블 헤더(th) 구성
  const headers = Object.keys(data[0]);
  headers.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    tableHeader.appendChild(th);
  });

  // 테이블 본문(tr, td) 구성
  data.forEach(row => {
    const tr = document.createElement('tr');

    // 판정 결과 체크 (판정 / 불량판정 등의 칼럼명 지원)
    const judgment = row['판정'] || row['불량판정'] || row['상태'] || '';
    if (judgment.toString().trim().toUpperCase() === 'NG') {
      tr.classList.add('ng-row'); // NG 행 배경색 처리
    }

    headers.forEach(header => {
      const td = document.createElement('td');
      let cellValue = row[header];

      // 숫자 타입 데이터인 경우 소수점 첫째 자리 포맷팅 체크
      if (!isNaN(cellValue) && cellValue !== '' && cellValue !== null) {
        const num = parseFloat(cellValue);
        // 정수인 경우 그대로, 소수점이 있는 실수는 .toFixed(1) 처리
        cellValue = Number.isInteger(num) ? num : num.toFixed(1);
      }

      td.textContent = cellValue;
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}