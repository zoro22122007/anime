const JIKAN_BASE = 'https://api.jikan.moe/v4';
let currentPage = 1;
let currentMode = 'top/anime';
let isLoading = false;
let searchTimeout;
let currentGenre = null;

const titles = {
    'top/anime': 'Global Rated Anime',
    'top/manga': 'Top Rated Manga',
    'top/manga?type=novel': 'Premium Light Novels',
    'seasons/now': 'Trending Now',
    'mylist': 'My Collection'
};

window.onload = () => loadData();

function getMyList() { return JSON.parse(localStorage.getItem('animeHubList')) || []; }

function showToast(message) {
    const host = document.getElementById('notificationHost');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    host.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

function showSkeletons() {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';
    for(let i=0; i<10; i++) {
        const skel = document.createElement('div');
        skel.className = 'skeleton';
        grid.appendChild(skel);
    }
}

async function loadData(append = false) {
    if (isLoading) return;
    isLoading = true;
    if (!append) showSkeletons();

    try {
        let url = `${JIKAN_BASE}/${currentMode}${currentMode.includes('?') ? '&' : '?'}page=${currentPage}`;
        if (currentGenre && currentMode !== 'mylist') url += `&genres=${currentGenre}`;
        
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

        let iconClass = currentMode === 'mylist' ? 'fa-trash' : 'fa-plus';
        let savedClass = (isSaved && currentMode !== 'mylist') ? 'saved' : '';

        card.innerHTML = `
            <button class="action-btn ${savedClass}" onclick="handleAction(event, this, ${JSON.stringify({id, title, img, score: item.score}).replace(/"/g, '&quot;')})">
                <i class="fas ${iconClass}"></i>
            </button>
            <img src="${img}" loading="lazy">
            <div class="card-overlay">
                <h4>${title}</h4>
                <div style="font-size:0.7rem; color:var(--primary); font-weight:800; margin-top:4px;">★ ${item.score || 'N/A'}</div>
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
        showToast("Removed from Collection");
    } else {
        if (!list.some(i => i.id === item.id)) {
            list.push(item);
            button.classList.add('saved');
            showToast("Added to Collection!");
        }
    }
    localStorage.setItem('animeHubList', JSON.stringify(list));
}

function setMode(mode, btnId) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    currentMode = mode;
    currentPage = 1;
    currentGenre = null;
    document.getElementById('sectionTitle').innerText = titles[mode];
    
    // Toggle UI Elements
    document.getElementById('clearAllBtn').style.display = (mode === 'mylist') ? 'flex' : 'none';
    document.getElementById('genreContainer').style.display = (mode === 'mylist') ? 'none' : 'flex';
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    
    if (mode === 'mylist') {
        document.getElementById('resultsGrid').innerHTML = '';
        displayCards(getMyList());
    } else { loadData(); }
}

function filterByGenre(genreId, btn) {
    currentGenre = genreId;
    currentPage = 1;
    document.querySelectorAll('.genre-tag').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loadData();
}

function openModal(item) {
    const modal = document.getElementById('infoModal');
    const body = document.getElementById('modalBody');
    const type = item.type || '';
    const imgUrl = item.images?.jpg?.large_image_url || item.img;
    const redirectUrl = (currentMode.includes('novel') || type.includes('Novel')) ? 'https://ranobes.top/' : 
                        (currentMode.includes('manga')) ? 'https://mangafire.to/home' : 'https://anikai.to/home';

    let btnText = (currentMode.includes('novel') || type.includes('Novel')) ? "READ NOVEL" : 
                 (currentMode.includes('manga')) ? "READ MANGA" : "WATCH NOW";

    body.innerHTML = `
        <img src="${imgUrl}" class="modal-img">
        <div class="modal-info">
            <h2 style="font-size: 1.8rem; margin-bottom: 10px;">${item.title_english || item.title}</h2>
            <div style="color:var(--primary); font-weight:800; margin-bottom:15px;">★ ${item.score || 'N/A'} | ${type}</div>
            <p style="line-height: 1.6; color: #aaa; margin-bottom: 25px; max-height:200px; overflow-y:auto;">${item.synopsis || 'No description available.'}</p>
            <button onclick="window.open('${redirectUrl}', '_blank')">${btnText}</button>
        </div>
    `;
    modal.style.display = "block";
}

function closeModal() { document.getElementById('infoModal').style.display = "none"; }

function clearFullList() {
    if(confirm("Wipe entire collection?")) {
        localStorage.setItem('animeHubList', '[]');
        document.getElementById('resultsGrid').innerHTML = '';
        showToast("Collection cleared");
    }
}

async function getRandom() {
    showSkeletons();
    document.getElementById('sectionTitle').innerText = "Destiny Awaits...";
    try {
        const type = currentMode.includes('manga') ? 'manga' : 'anime';
        const res = await fetch(`${JIKAN_BASE}/random/${type}`);
        const data = await res.json();
        document.getElementById('resultsGrid').innerHTML = '';
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
        showSkeletons();
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