// --- [1. DOM 요소 선택] ---
// HTML에 작성된 요소들의 id를 기반으로 JavaScript에서 제어할 수 있도록 가져옵니다.
// 안전한 DOM 접근을 위해 id가 정확히 일치하는지 확인합니다.
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const alertMessage = document.getElementById('alertMessage');

const profileContainer = document.getElementById('profileContainer');
const reposContainer = document.getElementById('reposContainer');
const reposList = document.getElementById('reposList');
const chartContainer = document.getElementById('chartContainer');
const repoChartCanvas = document.getElementById('repoChart');
const recommendedSection = document.getElementById('recommendedSection');
const recommendedTitle = document.getElementById('recommendedTitle');
const toggleIcon = document.getElementById('toggleIcon');
const recommendedDevsContainer = document.getElementById('recommendedDevs');

// 추천 개발자 데이터 배열
const recommendedUsers = [
    { login: 'torvalds', name: 'Linus Torvalds', desc: 'Linux 운영체제 및 Git 버전 관리 시스템의 창시자입니다.' },
    { login: 'gaearon', name: 'Dan Abramov', desc: 'React와 Redux를 만들었으며 현재 Meta에서 일하고 있습니다.' },
    { login: 'yyx990803', name: 'Evan You', desc: 'Vue.js 프레임워크와 Vite 빌드 도구의 창시자입니다.' },
    { login: 'tj', name: 'TJ Holowaychuk', desc: 'Express, Koa, Mocha 등 수백 개의 오픈소스를 만들었습니다.' },
    { login: 'taylorotwell', name: 'Taylor Otwell', desc: '전 세계에서 가장 인기 있는 PHP 프레임워크 Laravel의 창시자입니다.' },
    { login: 'sdras', name: 'Sarah Drasner', desc: 'Vue Core 팀원이며 Netlify의 엔지니어링 리더입니다.' },
    { login: 'bradtraversy', name: 'Brad Traversy', desc: 'Traversy Media를 통해 수많은 웹 개발자를 양성한 교육자입니다.' },
    { login: 'rauchg', name: 'Guillermo Rauch', desc: 'Next.js와 Vercel을 만든 실시간 웹 전문가입니다.' },
    { login: 'addyosmani', name: 'Addy Osmani', desc: 'Google Chrome 팀의 엔지니어이며 웹 성능 분야의 권위자입니다.' },
    { login: 'wesbos', name: 'Wes Bos', desc: 'Full Stack 개발자이자 가장 인기 있는 웹 개발 강사 중 한 명입니다.' }
];

// Chart.js 인스턴스를 저장할 전역 변수 (기존 차트를 파괴하기 위함)
let chartInstance = null;

// --- [2. 이벤트 리스너 설정] ---
// 버튼 클릭 시 검색 실행
searchBtn.addEventListener('click', handleSearch);

// 엔터 키를 눌렀을 때도 검색이 실행되도록 편의성 추가
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// --- [3. 메인 검색 핸들러 함수] ---
async function handleSearch() {
    // 1) 입력값 가져오기 (양쪽 공백 제거)
    const username = searchInput.value.trim();

    // 2) 빈 입력 방지 (유효성 검사)
    if (!username) {
        showAlert('GitHub ID를 입력해주세요.');
        return; // 더 이상 코드를 실행하지 않고 함수 종료 (API 요청 방지)
    }

    // 3) 검색 시작 시 기존 에러 메시지 숨기기
    hideAlert();

    // 4) API 호출 로직 (try...catch로 에러를 안전하게 잡습니다)
    try {
        // [프로필 데이터 가져오기]
        // await를 사용하여 데이터를 받아올 때까지 기다립니다.
        const userResponse = await fetch(`https://api.github.com/users/${username}`);
        
        // 상태 코드가 404인 경우 존재하지 않는 사용자입니다.
        if (userResponse.status === 404) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }
        
        // 응답이 성공적이지 않은 다른 에러 처리
        if (!userResponse.ok) {
            throw new Error('데이터를 불러오는데 실패했습니다.');
        }

        // 받아온 JSON 데이터를 JavaScript 객체로 변환
        const userData = await userResponse.json();

        // [저장소 데이터 가져오기]
        // sort=created (생성일 기준), direction=desc (내림차순), per_page=5 (5개만)
        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=created&direction=desc&per_page=5`);
        const reposData = await reposResponse.json();

        // 5) 성공적으로 데이터를 가져왔으므로 화면에 렌더링
        
        // 검색 성공 시 추천 섹션을 자동으로 축소하여 메인 콘텐츠 공간 확보
        if (recommendedSection.classList.contains('expanded')) {
            toggleRecommendedSection();
        }

        renderProfile(userData);
        renderRepos(reposData);
        renderChart(reposData);

    } catch (error) {
        // 네트워크 에러나 위에서 throw한 에러(404 등)를 여기서 처리합니다.
        showAlert(error.message);
        clearScreen(); // 에러 시 기존에 보이던 프로필, 저장소, 차트를 숨깁니다.
    }
}

// --- [4. 렌더링 및 모듈화 함수들] ---

/**
 * 프로필 정보를 HTML로 만들어 화면에 표시하는 함수
 * @param {Object} user - GitHub API에서 받아온 사용자 객체
 */
function renderProfile(user) {
    // 백틱(`)을 이용한 템플릿 리터럴로 HTML 문자열을 만듭니다.
    const profileHTML = `
        <div class="profile-card">
            <img src="${user.avatar_url}" alt="Profile Image" class="profile-avatar">
            <div class="profile-info">
                <h2>${user.name ? user.name : user.login}</h2>
                <span class="username">@${user.login}</span>
                <p class="bio">${user.bio ? user.bio : '등록된 소개가 없습니다.'}</p>
                <div class="profile-stats">
                    <span class="stat-badge">Followers: ${user.followers}</span>
                    <span class="stat-badge">Following: ${user.following}</span>
                    <span class="stat-badge">Public Repos: ${user.public_repos}</span>
                </div>
                <a href="${user.html_url}" target="_blank" class="view-profile-btn">GitHub에서 보기</a>
            </div>
        </div>
    `;

    // 만든 HTML을 컨테이너 안에 넣고, 숨김 처리(hidden)를 해제합니다.
    profileContainer.innerHTML = profileHTML;
    profileContainer.classList.remove('hidden');
}

/**
 * 최신 저장소 5개를 목록으로 렌더링하는 함수
 * @param {Array} repos - GitHub API에서 받아온 저장소 배열
 */
function renderRepos(repos) {
    // 저장소가 없는 경우 처리
    if (repos.length === 0) {
        reposList.innerHTML = '<p style="text-align: center; color: #8b949e;">최근 저장소가 없습니다.</p>';
        reposContainer.classList.remove('hidden');
        return;
    }

    // 배열을 순회하며 각 저장소마다 HTML 요소를 만듭니다.
    const reposHTML = repos.map(repo => {
        return `
            <div class="repo-item">
                <a href="${repo.html_url}" target="_blank">${repo.name}</a>
                <div class="repo-stats">
                    <span class="repo-stat-badge">⭐ ${repo.stargazers_count}</span>
                    <span class="repo-stat-badge">👁 ${repo.watchers_count}</span>
                    <span class="repo-stat-badge">🍴 ${repo.forks_count}</span>
                </div>
            </div>
        `;
    }).join(''); // 배열을 하나의 문자열로 합칩니다.

    reposList.innerHTML = reposHTML;
    reposContainer.classList.remove('hidden');
}

/**
 * Chart.js를 이용해 맨 하단에 스타 개수 막대그래프를 그리는 함수
 * @param {Array} repos - GitHub API에서 받아온 저장소 배열
 */
function renderChart(repos) {
    // 저장소가 없다면 차트를 그릴 필요가 없으므로 숨깁니다.
    if (repos.length === 0) {
        chartContainer.classList.add('hidden');
        return;
    }

    // 차트에 그릴 데이터(x축: 이름, y축: 스타 개수) 추출
    const labels = repos.map(repo => repo.name);
    const data = repos.map(repo => repo.stargazers_count);

    // 차트 컨테이너를 화면에 보이게 합니다.
    chartContainer.classList.remove('hidden');

    // ★ 중요: 기존에 그려진 차트가 있다면 반드시 파괴(destroy)해야 합니다.
    // 그렇지 않으면 캔버스 위에 차트가 겹쳐서 그려지거나 호버 에러가 발생합니다.
    if (chartInstance) {
        chartInstance.destroy();
    }

    // 2D 렌더링 컨텍스트를 가져와 새로운 차트를 생성합니다.
    const ctx = repoChartCanvas.getContext('2d');
    
    // 글로벌 폰트 색상 설정 (다크모드에 맞게)
    Chart.defaults.color = '#c9d1d9';

    chartInstance = new Chart(ctx, {
        type: 'bar', // 막대그래프
        data: {
            labels: labels, // x축 (저장소 이름들)
            datasets: [{
                label: 'Stars (스타 개수)',
                data: data, // y축 (스타 개수들)
                backgroundColor: 'rgba(88, 166, 255, 0.5)', // 파란색 반투명
                borderColor: '#58a6ff', // 파란색 테두리
                borderWidth: 1,
                borderRadius: 4 // 막대 모서리 둥글게
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // canvas-wrapper의 높이에 맞추기 위함
            scales: {
                y: {
                    beginAtZero: true, // y축은 0부터 시작
                    ticks: {
                        stepSize: 1 // 스타 개수는 정수이므로 1 단위로 표시
                    },
                    grid: {
                        color: 'rgba(48, 54, 61, 0.5)' // 격자선 색상
                    }
                },
                x: {
                    grid: {
                        display: false // x축 세로 격자선은 숨김 (깔끔하게)
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// --- [5. 유틸리티 함수들] ---

/**
 * 에러 메시지를 화면에 띄우는 함수
 * @param {string} msg - 띄울 메시지 내용
 */
function showAlert(msg) {
    alertMessage.textContent = msg;
    alertMessage.classList.remove('hidden');
    alertMessage.classList.add('error');
}

/**
 * 에러 메시지를 숨기는 함수 (새로운 검색 시도 시 호출)
 */
function hideAlert() {
    alertMessage.textContent = '';
    alertMessage.classList.add('hidden');
    alertMessage.classList.remove('error');
}

/**
 * 에러 발생 시 기존 데이터를 숨겨서 화면을 깔끔하게 유지하는 함수
 */
function clearScreen() {
    profileContainer.classList.add('hidden');
    reposContainer.classList.add('hidden');
    chartContainer.classList.add('hidden');
}

/**
 * 초기 화면의 추천 개발자 목록을 렌더링하는 함수
 */
function initRecommendedDevs() {
    // 티커(Ticker) 애니메이션이 끊김 없이 흐르도록 데이터를 한 번 더 복제합니다.
    const displayUsers = [...recommendedUsers, ...recommendedUsers];

    recommendedDevsContainer.innerHTML = displayUsers.map((user, i) => `
        <div class="dev-card" onclick="searchByUsername('${user.login}')">
            <span class="rank-bg">${(i % 10) + 1}</span>
            <img src="https://github.com/${user.login}.png" alt="${user.login}" onerror="this.src='https://github.com/identicons/${user.login}.png'">
            <div class="dev-name">${user.name}</div>
            <div class="dev-login">@${user.login}</div>
            <div class="dev-desc">${user.desc}</div>
        </div>
    `).join('');
}

/**
 * 추천 섹션의 확장/축소 상태를 전환하는 함수
 */
function toggleRecommendedSection() {
    const isExpanded = recommendedSection.classList.contains('expanded');
    
    if (isExpanded) {
        // 축소 상태로 변경 (티커 모드)
        recommendedSection.classList.remove('expanded');
        recommendedSection.classList.add('collapsed');
        toggleIcon.textContent = '▶';
    } else {
        // 확장 상태로 변경 (카드 모드)
        recommendedSection.classList.remove('collapsed');
        recommendedSection.classList.add('expanded');
        toggleIcon.textContent = '▼';
    }
}

// 제목 또는 아이콘 클릭 시 확장/축소 토글 이벤트 리스너
recommendedTitle.addEventListener('click', toggleRecommendedSection);

/**
 * 추천 카드를 클릭했을 때 해당 아이디로 자동 검색을 수행하는 함수
 * @param {string} username - 검색할 GitHub ID
 */
window.searchByUsername = function(username) {
    searchInput.value = username; // 검색창에 아이디 입력
    handleSearch(); // 검색 함수 실행
    
    // 클릭 시 페이지 상단으로 부드럽게 스크롤 (검색 결과를 바로 볼 수 있게)
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 앱 실행 시 추천 개발자 목록 초기화
initRecommendedDevs();
