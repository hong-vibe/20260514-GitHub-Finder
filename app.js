/**
 * [시니어 개발자 리뷰] Who's Hot in GitHub? 리팩토링 버전
 * 주요 개선 사항: 관심사 분리, 모던 ES6+ 문법, 견고한 예외 처리 및 로딩 UI 적용
 */

// --- [1. 상수 정의 (Configuration)] ---
// 코드 내에 직접 숫자를 쓰는 것(매직 넘버)보다 상수로 관리하면 유지보수가 훨씬 용이합니다.
const CONFIG = {
    MAX_REPOS: 5,           // 가져올 저장소 개수
    API_BASE_URL: 'https://api.github.com/users'
};

// --- [2. DOM 요소 선택] ---
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

let chartInstance = null;

// --- [3. API 통신 모듈화 (GitHubService)] ---
// API 호출 로직을 별도의 객체로 분리하여 관리합니다. (관심사의 분리)
// 이렇게 하면 나중에 API 주소가 바뀌거나 통신 방식(fetch -> axios 등)을 변경할 때 이 객체만 수정하면 됩니다.
const GitHubService = {
    async getUserProfile(username) {
        const response = await fetch(`${CONFIG.API_BASE_URL}/${username}`);
        if (response.status === 404) throw new Error('사용자를 찾을 수 없습니다. 🔍');
        if (!response.ok) throw new Error('데이터 호출 중 오류가 발생했습니다. 🌐');
        return response.json();
    },

    async getUserRepos(username) {
        const url = `${CONFIG.API_BASE_URL}/${username}/repos?sort=created&direction=desc&per_page=${CONFIG.MAX_REPOS}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('저장소 정보를 가져오지 못했습니다. 📂');
        return response.json();
    }
};

// --- [4. 이벤트 리스너 설정] ---
searchBtn.addEventListener('click', () => handleSearch());

// 엔터 키 입력 시 검색 실행 (화살표 함수 사용으로 간결화)
searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());

// 추천 섹션 토글
recommendedTitle.addEventListener('click', () => toggleRecommendedSection());

// --- [5. 비즈니스 로직 핸들러] ---
/**
 * 검색 프로세스를 조율하는 메인 함수입니다.
 * 실무에서는 이 함수가 '어떤 순서로 일이 일어날지'만 결정하도록 짧게 유지하는 것이 좋습니다.
 */
async function handleSearch() {
    const username = searchInput.value.trim();
    if (!username) return showAlert('GitHub ID를 입력해주세요! 💡');

    // 검색 시작 전 상태 초기화
    hideAlert();
    setLoading(true); // 로딩 시작

    try {
        // [데이터 fetch] API 서비스 모듈을 통해 데이터를 병렬적으로 요청할 준비를 합니다.
        // 여기서는 가독성을 위해 순차적으로 호출하였습니다.
        const userData = await GitHubService.getUserProfile(username);
        const reposData = await GitHubService.getUserRepos(username);

        // [UI 업데이트]
        // 검색 결과가 나오면 추천 섹션을 자동으로 축소합니다.
        if (recommendedSection.classList.contains('expanded')) {
            toggleRecommendedSection();
        }

        renderProfile(userData);
        renderRepos(reposData);
        renderChart(reposData);

    } catch (error) {
        // API 서비스나 위 로직에서 발생한 에러를 catch하여 UI에 표시합니다.
        showAlert(error.message);
        clearScreen();
    } finally {
        // 성공하든 실패하든 마지막엔 반드시 로딩 상태를 해제합니다. (방어적 프로그래밍)
        setLoading(false);
    }
}

// --- [6. UI 렌더링 함수들 (UI Components)] ---

/**
 * 로딩 상태를 UI에 반영합니다.
 * @param {boolean} isLoading 
 */
function setLoading(isLoading) {
    if (isLoading) {
        searchBtn.disabled = true;
        searchBtn.textContent = '검색 중...';
        searchBtn.style.opacity = '0.7';
        searchBtn.style.cursor = 'not-allowed';
    } else {
        searchBtn.disabled = false;
        searchBtn.textContent = '검색';
        searchBtn.style.opacity = '1';
        searchBtn.style.cursor = 'pointer';
    }
}

/**
 * 프로필 렌더링 (구조 분해 할당 적용)
 * @param {Object} user 
 */
function renderProfile(user) {
    // [구조 분해 할당] user 객체에서 필요한 값만 명시적으로 추출합니다.
    // user.avatar_url 대신 바로 avatar_url을 사용할 수 있어 코드가 훨씬 깔끔해집니다.
    const { 
        avatar_url, name, login, bio, 
        followers, following, public_repos, html_url 
    } = user;

    profileContainer.innerHTML = `
        <div class="profile-card">
            <img src="${avatar_url}" alt="${login}" class="profile-avatar">
            <div class="profile-info">
                <h2>${name || login}</h2>
                <span class="username">@${login}</span>
                <p class="bio">${bio || '등록된 소개가 없습니다.'}</p>
                <div class="profile-stats">
                    <span class="stat-badge">Followers: ${followers}</span>
                    <span class="stat-badge">Following: ${following}</span>
                    <span class="stat-badge">Public Repos: ${public_repos}</span>
                </div>
                <a href="${html_url}" target="_blank" class="view-profile-btn">GitHub에서 Profile 보기</a>
            </div>
        </div>
    `;
    profileContainer.classList.remove('hidden');
}

/**
 * 저장소 목록 렌더링
 * @param {Array} repos 
 */
function renderRepos(repos) {
    if (repos.length === 0) {
        reposList.innerHTML = '<p style="text-align: center; color: #8b949e;">최근 저장소가 없습니다. 🏜️</p>';
        reposContainer.classList.remove('hidden');
        return;
    }

    // map과 구조 분해 할당을 조합하여 간결하게 목록 생성
    reposList.innerHTML = repos.map(({ html_url, name, stargazers_count, watchers_count, forks_count }) => `
        <div class="repo-item">
            <a href="${html_url}" target="_blank">${name}</a>
            <div class="repo-stats">
                <span class="repo-stat-badge">⭐ ${stargazers_count}</span>
                <span class="repo-stat-badge">👁 ${watchers_count}</span>
                <span class="repo-stat-badge">🍴 ${forks_count}</span>
            </div>
        </div>
    `).join('');
    reposContainer.classList.remove('hidden');
}

/**
 * Chart.js를 활용한 스타 랭킹 차트 렌더링
 * @param {Array} repos 
 */
function renderChart(repos) {
    if (repos.length === 0) return chartContainer.classList.add('hidden');

    const labels = repos.map(r => r.name);
    const starCounts = repos.map(r => r.stargazers_count);

    chartContainer.classList.remove('hidden');
    if (chartInstance) chartInstance.destroy();

    const ctx = repoChartCanvas.getContext('2d');
    Chart.defaults.color = '#c9d1d9';

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Stars',
                data: starCounts,
                backgroundColor: 'rgba(88, 166, 255, 0.5)',
                borderColor: '#58a6ff',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(48, 54, 61, 0.5)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// --- [7. 추천 개발자 관련 (Recommended Developers)] ---

const RECOMMENDED_DEVS = [
    { login: 'torvalds', name: 'Linus Torvalds', desc: 'Linux 및 Git 창시자' },
    { login: 'karpathy', name: 'Andrej Karpathy', desc: '전 테슬라 AI 디렉터, AI 권위자' },
    { login: 'gustavoguanabara', name: 'Gustavo Guanabara', desc: '브라질 유명 IT 교육자' },
    { login: 'yyx990803', name: 'Evan You', desc: 'Vue.js 및 Vite 창시자' },
    { login: 'gaearon', name: 'Dan Abramov', desc: 'React 코어 팀, Redux 창시자' },
    { login: 'peng-zhihui', name: 'Zhihui Peng', desc: '로봇/하드웨어 엔지니어' },
    { login: 'ruanyf', name: 'Ruan YiFeng', desc: '중국 저명 개발자 및 저자' },
    { login: 'sindresorhus', name: 'Sindre Sorhus', desc: '풀타임 오픈소스 개발자' },
    { login: 'bradtraversy', name: 'Brad Traversy', desc: '유튜브 Traversy Media 운영자' },
    { login: 'claude', name: 'Claude', desc: 'Anthropic AI 프로젝트 계정' }
];

/**
 * 추천 개발자 목록 초기화 및 무한 티커 준비
 */
function initRecommendedDevs() {
    // 티커 효과를 위해 데이터를 복제하여 연속성을 확보합니다.
    const displayUsers = [...RECOMMENDED_DEVS, ...RECOMMENDED_DEVS];
    
    recommendedDevsContainer.innerHTML = displayUsers.map(({ login, name, desc }, i) => `
        <div class="dev-card" onclick="searchByUsername('${login}')">
            <span class="rank-bg">${(i % 10) + 1}</span>
            <img src="https://github.com/${login}.png" alt="${login}" onerror="this.src='https://github.com/identicons/${login}.png'">
            <div class="dev-name">${name}</div>
            <div class="dev-login">@${login}</div>
            <div class="dev-desc">${desc}</div>
        </div>
    `).join('');
}

/**
 * 추천 섹션 토글
 */
function toggleRecommendedSection() {
    const isExpanded = recommendedSection.classList.contains('expanded');
    recommendedSection.classList.toggle('expanded', !isExpanded);
    recommendedSection.classList.toggle('collapsed', isExpanded);
    toggleIcon.textContent = isExpanded ? '▶' : '▼';
}

/**
 * 카드 클릭 시 자동 검색
 */
window.searchByUsername = (username) => {
    searchInput.value = username;
    handleSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- [8. 유틸리티 함수 (Utilities)] ---

// 화살표 함수를 사용하여 코드를 더욱 현대적이고 간결하게 작성합니다.
const showAlert = (msg) => {
    alertMessage.textContent = msg;
    alertMessage.classList.remove('hidden');
    alertMessage.classList.add('error');
};

const hideAlert = () => alertMessage.classList.add('hidden');

const clearScreen = () => {
    [profileContainer, reposContainer, chartContainer].forEach(el => el.classList.add('hidden'));
};

// 앱 로드 시 추천 리스트 초기화
initRecommendedDevs();
