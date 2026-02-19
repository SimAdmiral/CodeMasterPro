let studyData = JSON.parse(localStorage.getItem('codeMasteryData')) || [];
let currentEditTask = null;

// --- INITIALIZATION ---
function initSortables() {
    new Sortable(document.getElementById('weeks-container'), {
        animation: 250,
        handle: '.week-header',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const moved = studyData.splice(evt.oldIndex, 1)[0];
            studyData.splice(evt.newIndex, 0, moved);
            saveDataOnly();
            renderNavigation();
        }
    });

    document.querySelectorAll('.task-grid').forEach(grid => {
        new Sortable(grid, {
            group: 'tasks',
            animation: 250,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                const fromW = parseInt(evt.from.dataset.widx);
                const toW = parseInt(evt.to.dataset.widx);
                const taskName = evt.item.dataset.name;
                const taskIdx = studyData[fromW].tasks.findIndex(t => t.name === taskName);
                const taskObj = studyData[fromW].tasks.splice(taskIdx, 1)[0];
                studyData[toW].tasks.splice(evt.newIndex, 0, taskObj);
                save();
                renderList();
            }
        });
    });
}

// --- RENDER FUNCTIONS ---
function renderList() {
    const container = document.getElementById('weeks-container');
    container.innerHTML = '';

    studyData.forEach((week, wIdx) => {
        const weekEl = document.createElement('div');
        weekEl.className = 'week-block';
        weekEl.id = `week-target-${wIdx}`;
        
        const categories = [
            { label: 'P - Implementation', prefix: 'p' },
            { label: 'R - Reverse Logic', prefix: 'r' },
            { label: 'V - Verification', prefix: 'v' },
            { label: 'Other', prefix: 'other' }
        ];

        let catHtml = '';
        categories.forEach(cat => {
            const tasks = week.tasks.filter(t => {
                const start = t.name.toLowerCase().charAt(0);
                return cat.prefix === 'other' ? !['p','r','v'].includes(start) : start === cat.prefix;
            });

            if (tasks.length === 0 && cat.prefix === 'other') return;

            catHtml += `
                <div class="subgroup-label">${cat.label}</div>
                <div class="task-grid" data-widx="${wIdx}" data-prefix="${cat.prefix}">
                    ${tasks.map(task => `
                        <div class="card status-${task.status}" data-name="${task.name}">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                                <strong style="font-size:0.95rem; font-family:monospace; word-break:break-all; margin-right:10px;">${task.name}</strong>
                                <div style="display:flex; gap: 4px;">
                                    <button class="action-icon" onclick="renameTask(${wIdx}, '${task.name}')">✏️</button>
                                    <button class="action-icon" onclick="deleteTask(${wIdx}, '${task.name}')">×</button>
                                </div>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div class="status-dots">
                                    ${[0,1,2,3].map(s => `
                                        <span onclick="updateStatus(${wIdx},'${task.name}',${s})" 
                                              class="${task.status === s ? 'active' : ''}"
                                              style="background:var(--${['red','orange','yellow','green'][s]}); color:var(--${['red','orange','yellow','green'][s]})">
                                        </span>
                                    `).join('')}
                                </div>
                                <button class="ws-btn" onclick="openEditorByName(${wIdx}, '${task.name}')">Workspace</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        });

        weekEl.innerHTML = `
            <div class="week-header">
                <span class="week-title">${week.title}</span>
                <div class="header-actions">
                    <button class="add-btn" onclick="addTask(${wIdx})">+ Task</button>
                    <button onclick="editWeek(${wIdx})">✏️</button>
                    <button onclick="deleteWeek(${wIdx})">🗑️</button>
                </div>
            </div>
            ${catHtml}`;
        container.appendChild(weekEl);
    });
    initSortables();
}

function renderNavigation() {
    const navContainer = document.getElementById('week-nav-list');
    if (!navContainer) return;
    navContainer.innerHTML = studyData.map((week, idx) => `
        <div class="nav-item" onclick="scrollToWeek(${idx})">
            <span>📍</span> ${week.title || 'Untitled Week'}
        </div>
    `).join('');
}

function scrollToWeek(idx) {
    const target = document.getElementById(`week-target-${idx}`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// --- IDE LOGIC ---
function updateEditor() {
    const textArea = document.getElementById('task-code');
    const prismCode = document.getElementById('prism-code');
    const lineNumbers = document.getElementById('line-numbers');
    const content = textArea.value;
    prismCode.textContent = content + (content.endsWith('\n') ? ' ' : '');
    Prism.highlightElement(prismCode);
    const lines = content.split('\n').length;
    lineNumbers.innerHTML = Array.from({length: lines}, (_, i) => i + 1).join('<br>');
}

function syncScroll() {
    const textArea = document.getElementById('task-code');
    document.getElementById('prism-pre').scrollTop = textArea.scrollTop;
    document.getElementById('prism-pre').scrollLeft = textArea.scrollLeft;
    document.getElementById('line-numbers').scrollTop = textArea.scrollTop;
}

function openEditorByName(wIdx, name) {
    const tIdx = studyData[wIdx].tasks.findIndex(t => t.name === name);
    currentEditTask = { wIdx, tIdx };
    const task = studyData[wIdx].tasks[tIdx];
    document.getElementById('modal-task-name').innerText = task.name;
    document.getElementById('task-code').value = task.code || "";
    document.getElementById('editor-modal').style.display = 'block';
    setTimeout(() => { updateEditor(); syncScroll(); }, 20);
}

document.getElementById('task-code').addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        this.value = this.value.substring(0, start) + "    " + this.value.substring(this.selectionEnd);
        this.selectionStart = this.selectionEnd = start + 4;
        updateEditor();
    }
});

// --- CORE UTILS ---
function save() { 
    localStorage.setItem('codeMasteryData', JSON.stringify(studyData)); 
    updateStats(); 
    renderNavigation(); 
}
function saveDataOnly() { localStorage.setItem('codeMasteryData', JSON.stringify(studyData)); }

function updateStatus(wIdx, name, s) {
    const tIdx = studyData[wIdx].tasks.findIndex(t => t.name === name);
    studyData[wIdx].tasks[tIdx].status = s;
    save(); renderList();
}

function addTask(wIdx) {
    const n = prompt("Task Name:");
    if(n) { studyData[wIdx].tasks.push({name: n, status: 0, code: ""}); save(); renderList(); }
}

function renameTask(wIdx, oldName) {
    const tIdx = studyData[wIdx].tasks.findIndex(t => t.name === oldName);
    const n = prompt("Rename task:", oldName);
    if(n && n.trim() !== "") {
        studyData[wIdx].tasks[tIdx].name = n.trim();
        save(); renderList();
    }
}

function deleteTask(wIdx, name) {
    if(confirm(`Delete ${name}?`)) {
        studyData[wIdx].tasks = studyData[wIdx].tasks.filter(t => t.name !== name);
        save(); renderList();
    }
}

function addWeek() {
    const t = prompt("Week Title:");
    if(t) { studyData.unshift({title: t, tasks: []}); save(); renderList(); }
}

function editWeek(wIdx) {
    const n = prompt("New Title:", studyData[wIdx].title);
    if(n) { studyData[wIdx].title = n; save(); renderList(); }
}

function deleteWeek(wIdx) {
    if(confirm("Delete entire week?")) { studyData.splice(wIdx, 1); save(); renderList(); }
}

function saveEditor() {
    if(currentEditTask) {
        studyData[currentEditTask.wIdx].tasks[currentEditTask.tIdx].code = document.getElementById('task-code').value;
        save();
    }
}
function closeEditor() { saveEditor(); document.getElementById('editor-modal').style.display = 'none'; }

function updateStats() {
    let total = 0, counts = [0,0,0,0];
    studyData.forEach(w => w.tasks.forEach(t => { total++; counts[t.status]++; }));
    const p = total ? Math.round((counts[3]/total)*100) : 0;
    const donut = document.getElementById('mastery-donut');
    if(donut) {
        const p0 = (counts[0]/total)*100 || 0, p1 = (counts[1]/total)*100 || 0, p2 = (counts[2]/total)*100 || 0;
        donut.style.background = `conic-gradient(var(--red) 0% ${p0}%, var(--orange) ${p0}% ${p0+p1}%, var(--yellow) ${p0+p1}% ${p0+p1+p2}%, var(--green) ${p0+p1+p2}% 100%)`;
        document.getElementById('mastery-percent').innerText = p + "%";
        document.getElementById('status-counts').innerHTML = `
            <div class="status-list">
                <div class="status-item"><span class="status-dot" style="background:var(--red)"></span> Unknown: ${counts[0]}</div>
                <div class="status-item"><span class="status-dot" style="background:var(--orange)"></span> Theory: ${counts[1]}</div>
                <div class="status-item"><span class="status-dot" style="background:var(--yellow)"></span> Buggy: ${counts[2]}</div>
                <div class="status-item"><span class="status-dot" style="background:var(--green)"></span> Mastered: ${counts[3]}</div>
            </div>`;
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isL = document.body.classList.contains('light-mode');
    document.getElementById('prism-theme').href = isL ? 
        "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" : 
        "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css";
}

function switchTab(t) {
    document.getElementById('list-view').style.display = t === 'list' ? 'block' : 'none';
    document.getElementById('converter-view').style.display = t === 'converter' ? 'block' : 'none';
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.id.includes(t)));
}

function exportData() {
    const data = JSON.stringify(studyData, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'code_mastery_backup.json'; a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (event) => { studyData = JSON.parse(event.target.result); save(); renderList(); };
    reader.readAsText(e.target.files[0]);
}

function resetAll() { if(confirm("Permanently erase ALL data?")) { studyData = []; save(); renderList(); } }

function runConverter() {
    const input = document.getElementById('converter-input').value;
    const lines = input.split('\n');
    let newData = [], currentWeek = null;
    lines.forEach(line => {
        if (line.trim().startsWith('###')) {
            currentWeek = { title: line.replace(/###/g, '').trim(), tasks: [] };
            newData.push(currentWeek);
        } else if (line.includes('color:')) {
            let status = line.includes('orange')?1:line.includes('yellow')?2:line.includes('green')?3:0;
            const name = line.replace(/<[^>]*>/g, '').replace(/^- /g, '').trim();
            if (currentWeek && name) currentWeek.tasks.push({ name, status, code: "" });
        }
    });
    if (newData.length > 0) { studyData = newData; save(); renderList(); switchTab('list'); }
}

// Start Up
renderList();
updateStats();
renderNavigation();