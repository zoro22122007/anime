const JIKAN_BASE = 'https://api.jikan.moe/v4';
let currentPage = 1;
let currentMode = 'top/anime';
let isLoading = false;
let searchTimeout;

const titles = {
    'top/anime': 'Global Rated Anime',
    'top/manga': 'Top Rated Manga',
    'top/manga?type=novel': 'Premium Light Novels',
    'seasons/now': 'Trending Now',
    'mylist': 'My Collection'
};

window.onload = () => loadData();

function getMyList() { return JSON.parse(localStorage.getItem('animeHubList')) || []; }

async function loadData(append = false) {
    if (isLoading) return;
    isLoading = true;
    try {
        const url = `${JIKAN_BASE}/${currentMode}${currentMode.includes('?') ? '&' : '?'}page=${currentPage}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!append) document.getElementById('resultsGrid').innerHTML = '';
        displayCards(data.data);
        currentPage++;
    } catch (e) { console.error(e); }
    finally { isLoading = false; }
}

function displayCards(list) {
    const grid = document.getElementById('resultsGrid');
    const myIds = getMyList().map(i => i.id);

    list.forEach((item, index) => {
        const id = item.mal_id || item.id;
        const title = item.title_english || item.title;
        const img = item.images?.jpg?.large_image_url || item.img;
        const isSaved = myIds.includes(id);

        const card = document.createElement('div');
        card.className = 'card show';
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <button class="action-btn" onclick="handleAction(event, this, ${JSON.stringify({id, title, img, score: item.score}).replace(/"/g, '&quot;')})">
                <i class="${currentMode === 'mylist' ? 'fas fa-trash' : (isSaved ? 'fas fa-check' : 'fas fa-plus')}"></i>
            </button>
            <img src="${img}" loading="lazy">
            <div class="card-overlay">
                <h4 style="margin-bottom:5px;">${title}</h4>
                <div style="font-size:0.8rem; color:var(--primary); font-weight:700;">★ ${item.score || 'N/A'}</div>
            </div>
        `;
        
        card.onclick = (e) => {
            if (!e.target.closest('.action-btn')) openModal(item);
        };
        grid.appendChild(card);
    });
}

function handleAction(event, button, item) {
    event.stopPropagation();
    let list = getMyList();
    if (currentMode === 'mylist') {
        list = list.filter(i => i.id !== item.id);
        button.closest('.card').remove();
    } else {
        if (!list.some(i => i.id === item.id)) {
            list.push(item);
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.style.background = '#2ed573';
        }
    }
    localStorage.setItem('animeHubList', JSON.stringify(list));
}

function setMode(mode, btnId) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    currentMode = mode;
    currentPage = 1;
    document.getElementById('sectionTitle').innerText = titles[mode];
    document.getElementById('clearAllBtn').style.display = (mode === 'mylist') ? 'flex' : 'none';
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    
    if (mode === 'mylist') {
        document.getElementById('resultsGrid').innerHTML = '';
        displayCards(getMyList());
    } else { loadData(); }
}

function openModal(item) {
    const modal = document.getElementById('infoModal');
    const body = document.getElementById('modalBody');
    const type = item.type || '';
    const redirectUrl = (currentMode.includes('novel') || type.includes('Novel')) ? 'https://ranobes.top/' : 
                        (currentMode.includes('manga')) ? 'https://mangafire.to/home' : 'https://anikai.to/home';

    let btnText = "WATCH NOW";
    if (currentMode.includes('novel') || type.includes('Novel')) btnText = "READ NOVEL";
    else if (currentMode.includes('manga')) btnText = "READ MANGA";

    body.innerHTML = `
        <img src="${item.images.jpg.large_image_url}" class="modal-img">
        <div class="modal-info">
            <h2 style="font-size: 2.2rem; margin-bottom: 12px; letter-spacing:-1px;">${item.title_english || item.title}</h2>
            <div style="color:var(--primary); font-weight:800; margin-bottom:20px; font-size:1.1rem;">★ ${item.score || 'N/A'} | ${type}</div>
            <p style="line-height: 1.8; color: #aaa; margin-bottom: 35px; max-height:220px; overflow-y:auto;">${item.synopsis || 'No description available.'}</p>
            <button onclick="window.open('${redirectUrl}', '_blank')" style="background:var(--primary); color:white; border:none; padding:18px 45px; border-radius:18px; font-weight:800; cursor:pointer; text-transform:uppercase; box-shadow: 0 10px 20px var(--primary-glow);">${btnText}</button>
        </div>
    `;
    modal.style.display = "block";
}

function closeModal() { document.getElementById('infoModal').style.display = "none"; }

function clearFullList() {
    if(confirm("Are you sure you want to wipe your entire collection?")) {
        localStorage.setItem('animeHubList', '[]');
        document.getElementById('resultsGrid').innerHTML = '';
    }
}

async function getRandom() {
    document.getElementById('resultsGrid').innerHTML = '';
    document.getElementById('sectionTitle').innerText = "Rolling Destiny...";
    try {
        const type = currentMode.includes('manga') ? 'manga' : 'anime';
        const res = await fetch(`${JIKAN_BASE}/random/${type}`);
        const data = await res.json();
        displayCards([data.data]);
    } catch (e) { console.error(e); }
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (!query) {
        if(query === "") setMode(currentMode, document.querySelector('.nav-btn.active').id);
        return;
    }
    searchTimeout = setTimeout(async () => {
        let typeSearch = (currentMode.includes('manga') || currentMode.includes('novel')) ? 'manga' : 'anime';
        const res = await fetch(`${JIKAN_BASE}/${typeSearch}?q=${query}`);
        const data = await res.json();
        document.getElementById('resultsGrid').innerHTML = '';
        displayCards(data.data);
    }, 600);
});

window.onscroll = () => {
    if (currentMode === 'mylist') return;
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        if (!isLoading) loadData(true);
    }
};