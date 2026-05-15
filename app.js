/**
 * [리팩토링 버전] Who's Hot on GitHub?
 * 아키텍처: OOP (Object-Oriented Programming) + 상태 기반 렌더링
 * 주요 개선: 관찰자 패턴(Observer Pattern)을 활용한 상태 관리, 클래스 기반 컴포넌트화
 */

// --- [1. Configuration] ---
const CONFIG = {
    MAX_REPOS: 5,
    API_BASE_URL: 'https://api.github.com/users',
    THEME_KEY: 'github-finder-theme'
};

// --- [2. Github API Service] ---
class GithubService {
    static async getUserProfile(username) {
        const response = await fetch(`${CONFIG.API_BASE_URL}/${username}`);
        if (response.status === 404) throw new Error('사용자를 찾을 수 없습니다. 🔍');
        if (!response.ok) throw new Error('데이터 호출 중 오류가 발생했습니다. 🌐');
        return response.json();
    }

    static async getUserRepos(username) {
        const url = `${CONFIG.API_BASE_URL}/${username}/repos?sort=created&direction=desc&per_page=${CONFIG.MAX_REPOS}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('저장소 정보를 가져오지 못했습니다. 📂');
        return response.json();
    }
}

// --- [3. State Management (Store)] ---
class Store {
    constructor() {
        this.state = {
            user: null,
            repos: [],
            isLoading: false,
            error: null,
            theme: localStorage.getItem(CONFIG.THEME_KEY) || 'dark',
            isRecommendedExpanded: true
        };
        this.listeners = [];
    }

    // 상태 변경 및 리스너 알림
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    // 구독 (UI 컴포넌트들이 상태 변화를 감지할 수 있게 함)
    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

// --- [4. Base Component] ---
class Component {
    constructor(elementId, store) {
        this.element = document.getElementById(elementId);
        this.store = store;
        if (this.store) {
            this.store.subscribe((state) => this.render(state));
        }
    }

    render(state) {
        // 하위 클래스에서 구현
    }
}

// --- [5. UI Components] ---

// 검색 및 헤더 컴포넌트
class SearchComponent extends Component {
    constructor(elementId, store, onSearch) {
        super(elementId, store);
        this.onSearch = onSearch;
        this.initEvents();
    }

    initEvents() {
        const searchInput = this.element.querySelector('#searchInput');
        const searchBtn = this.element.querySelector('#searchBtn');
        const themeBtn = this.element.querySelector('#themeBtn');

        searchBtn.addEventListener('click', () => this.handleSearch());
        searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.handleSearch());
        themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    handleSearch() {
        const username = this.element.querySelector('#searchInput').value.trim();
        if (username) this.onSearch(username);
    }

    toggleTheme() {
        const newTheme = this.store.state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem(CONFIG.THEME_KEY, newTheme);
        this.store.setState({ theme: newTheme });
    }

    render(state) {
        const themeBtn = this.element.querySelector('#themeBtn');
        const alertMessage = this.element.querySelector('#alertMessage');
        const searchBtn = this.element.querySelector('#searchBtn');

        // 테마 아이콘 업데이트
        themeBtn.textContent = state.theme === 'light' ? '☀️' : '🌙';
        document.body.setAttribute('data-theme', state.theme === 'light' ? 'light' : '');

        // 에러 메시지 처리
        if (state.error) {
            alertMessage.textContent = state.error;
            alertMessage.classList.remove('hidden');
            alertMessage.classList.add('error');
        } else {
            alertMessage.classList.add('hidden');
        }

        // 로딩 상태 처리
        searchBtn.disabled = state.isLoading;
        searchBtn.textContent = state.isLoading ? '검색 중...' : '검색';
        searchBtn.style.opacity = state.isLoading ? '0.7' : '1';
    }
}

// 프로필 컴포넌트
class ProfileComponent extends Component {
    render(state) {
        if (!state.user) {
            this.element.classList.add('hidden');
            return;
        }

        const { avatar_url, name, login, bio, followers, following, public_repos, html_url } = state.user;
        this.element.innerHTML = `
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
        this.element.classList.remove('hidden');
    }
}

// 저장소 컴포넌트
class ReposComponent extends Component {
    render(state) {
        if (!state.user) {
            this.element.classList.add('hidden');
            return;
        }

        const reposList = this.element.querySelector('#reposList');
        if (state.repos.length === 0) {
            reposList.innerHTML = '<p style="text-align: center; color: #8b949e;">최근 저장소가 없습니다. 🏜️</p>';
        } else {
            reposList.innerHTML = state.repos.map(repo => `
                <div class="repo-item">
                    <div class="repo-info">
                        <a href="${repo.html_url}" target="_blank" class="repo-name">${repo.name}</a>
                        <p class="repo-description">${repo.description || '설명이 없습니다.'}</p>
                    </div>
                    <div class="repo-stats">
                        <span class="repo-stat-badge">⭐ ${repo.stargazers_count}</span>
                        <span class="repo-stat-badge">👁 ${repo.watchers_count}</span>
                        <span class="repo-stat-badge">🍴 ${repo.forks_count}</span>
                    </div>
                </div>
            `).join('');
        }
        this.element.classList.remove('hidden');
    }
}

// 차트 컴포넌트
class ChartComponent extends Component {
    constructor(elementId, store) {
        super(elementId, store);
        this.chart = null;
    }

    render(state) {
        if (!state.user || state.repos.length === 0) {
            this.element.classList.add('hidden');
            return;
        }

        this.element.classList.remove('hidden');
        this.renderChart(state.repos, state.theme);
    }

    renderChart(repos, theme) {
        const ctx = document.getElementById('repoChart').getContext('2d');
        if (this.chart) this.chart.destroy();

        const isLight = theme === 'light';
        Chart.defaults.color = isLight ? '#24292f' : '#c9d1d9';

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: repos.map(r => r.name),
                datasets: [{
                    label: 'Stars',
                    data: repos.map(r => r.stargazers_count),
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
}

// 추천 개발자 컴포넌트
class RecommendedComponent extends Component {
    constructor(elementId, store, onSearch) {
        super(elementId, store);
        this.onSearch = onSearch;
        this.devs = [
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
        this.init();
    }

    init() {
        const title = this.element.querySelector('#recommendedTitle');
        title.addEventListener('click', () => this.toggleExpand());
        this.renderList();
        
        // 전역 함수 연결 (기존 카드 클릭 이벤트 호환)
        window.searchByUsername = (username) => {
            document.getElementById('searchInput').value = username;
            this.onSearch(username);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }

    toggleExpand() {
        const isExpanded = this.store.state.isRecommendedExpanded;
        this.store.setState({ isRecommendedExpanded: !isExpanded });
    }

    renderList() {
        const container = this.element.querySelector('#recommendedDevs');
        const displayUsers = [...this.devs, ...this.devs];
        container.innerHTML = displayUsers.map(({ login, name, desc }, i) => `
            <div class="dev-card" onclick="searchByUsername('${login}')">
                <span class="rank-bg">${(i % 10) + 1}</span>
                <img src="https://github.com/${login}.png" alt="${login}" onerror="this.src='https://github.com/identicons/${login}.png'">
                <div class="dev-name">${name}</div>
                <div class="dev-login">@${login}</div>
                <div class="dev-desc">${desc}</div>
            </div>
        `).join('');
    }

    render(state) {
        const toggleIcon = this.element.querySelector('#toggleIcon');
        this.element.classList.toggle('expanded', state.isRecommendedExpanded);
        this.element.classList.toggle('collapsed', !state.isRecommendedExpanded);
        toggleIcon.textContent = state.isRecommendedExpanded ? '▼' : '▶';
    }
}

// --- [6. App Controller] ---
class App {
    constructor() {
        this.store = new Store();
        this.init();
    }

    async init() {
        // 컴포넌트 초기화
        new SearchComponent('searchHeader', this.store, (username) => this.handleSearch(username));
        new ProfileComponent('profileContainer', this.store);
        new ReposComponent('reposContainer', this.store);
        new ChartComponent('chartContainer', this.store);
        new RecommendedComponent('recommendedSection', this.store, (username) => this.handleSearch(username));

        // 초기 테마 적용
        document.body.setAttribute('data-theme', this.store.state.theme === 'light' ? 'light' : '');
    }

    async handleSearch(username) {
        if (!username) return;

        this.store.setState({ isLoading: true, error: null });

        try {
            // 병렬 데이터 페칭 (성능 최적화)
            const [userData, reposData] = await Promise.all([
                GithubService.getUserProfile(username),
                GithubService.getUserRepos(username)
            ]);

            this.store.setState({
                user: userData,
                repos: reposData,
                isLoading: false,
                isRecommendedExpanded: false // 검색 시 추천 섹션 접기
            });

        } catch (error) {
            this.store.setState({
                error: error.message,
                isLoading: false,
                user: null,
                repos: []
            });
        }
    }
}

// 앱 실행
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
