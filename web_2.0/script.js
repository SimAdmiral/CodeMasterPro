let studyData = JSON.parse(localStorage.getItem('codeMasteryData')) || [];
let currentEditTask = null;
let projectRoot = localStorage.getItem('projectRootPath') || '';
let globalDirHandle = null;



// --- SIDEBAR TOGGLE ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebar-open-btn');
    
    // Toggle class
    sidebar.classList.toggle('collapsed');
    
    // Check state
    const isClosed = sidebar.classList.contains('collapsed');
    
    // Show/Hide the open button based on state
    openBtn.style.display = isClosed ? 'flex' : 'none';
    
    // Save preference
    localStorage.setItem('sidebarCollapsed', isClosed);
}


// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    const isClosed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isClosed) {
        document.getElementById('sidebar').classList.add('collapsed');
        document.getElementById('sidebar-open-btn').style.display = 'flex';
    }


    const pathInput = document.getElementById('base-path');
    if (pathInput) {
        pathInput.value = projectRoot;
        pathInput.addEventListener('input', (e) => {
            let cleaned = e.target.value.replace(/\\/g, '/');
            if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);
            projectRoot = cleaned;
            localStorage.setItem('projectRootPath', projectRoot);
            renderList();
        });
    }
    renderList();
});

// --- DRAG & DROP ---
// function initSortables() {
//     new Sortable(document.getElementById('weeks-container'), {
//         animation: 250,
//         handle: '.week-header',
//         ghostClass: 'sortable-ghost',
//         onEnd: (evt) => {
//             const moved = studyData.splice(evt.oldIndex, 1)[0];
//             studyData.splice(evt.newIndex, 0, moved);
//             save();
//             renderNavigation();
//         }
//     });

//     document.querySelectorAll('.task-grid').forEach(grid => {
//         new Sortable(grid, {
//             group: 'tasks',
//             animation: 250,
//             ghostClass: 'sortable-ghost',
//             onEnd: (evt) => {
//                 const fromW = parseInt(evt.from.dataset.widx);
//                 const toW = parseInt(evt.to.dataset.widx);
//                 const taskName = evt.item.dataset.name;
                
//                 const taskIdx = studyData[fromW].tasks.findIndex(t => t.name === taskName);
//                 if (taskIdx === -1) return;

//                 const taskObj = studyData[fromW].tasks.splice(taskIdx, 1)[0];
//                 studyData[toW].tasks.splice(evt.newIndex, 0, taskObj);
                
//                 save();
//                 renderList();
//             }
//         });
//     });
// }



// imporved 

function initSortables() {
    new Sortable(document.getElementById('weeks-container'), {
        animation: 250,
        handle: '.week-header',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const moved = studyData.splice(evt.oldIndex, 1)[0];
            studyData.splice(evt.newIndex, 0, moved);
            save();
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
                
                // 1. Find and remove the task from the source array
                const fromWeekTasks = studyData[fromW].tasks;
                const taskIdx = fromWeekTasks.findIndex(t => t.name === taskName);
                if (taskIdx === -1) return;
                const [taskObj] = fromWeekTasks.splice(taskIdx, 1);

                // 2. Find the correct insertion point in the target array
                const toWeekTasks = studyData[toW].tasks;
                const nextItem = evt.item.nextElementSibling;
                
                if (nextItem) {
                    // If there is an item after our drop position, insert before it in the data
                    const nextTaskName = nextItem.dataset.name;
                    const nextTaskIdx = toWeekTasks.findIndex(t => t.name === nextTaskName);
                    toWeekTasks.splice(nextTaskIdx, 0, taskObj);
                } else {
                    // If dropped at the end of a grid, just push to the end of the data
                    toWeekTasks.push(taskObj);
                }
                
                save();
                // We timeout the render slightly to let Sortable finish its animation 
                // and prevent flickering/reverting
                setTimeout(renderList, 10);
            }
        });
    });
}




// --- RENDER ---
function renderList() {
    const container = document.getElementById('weeks-container');
    if (!container) return;
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
                <div class="task-grid" data-widx="${wIdx}">
                    ${tasks.map(task => {
                        const folder = week.folderNum || String(wIdx).padStart(2, '0');
                        const vscodeUrl = projectRoot ? `vscode://file/${projectRoot}/${folder}/${task.name}` : "#";
                        const onclick = projectRoot ? "" : `onclick="alert('Enter path in sidebar first!')"`;

                        return `
                        <div class="card status-${task.status}" data-name="${task.name}">
                            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                                <strong style="font-family:monospace; font-size:0.9rem;">${task.name}</strong>
                                <div style="display:flex; gap: 4px;">
                                    <button class="action-icon" onclick="renameTask(${wIdx}, '${task.name}')">✏️</button>
                                    <button class="action-icon" onclick="deleteTask(${wIdx}, '${task.name}')">×</button>
                                </div>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                                <div class="status-dots">
                                    ${[0,1,2,3].map(s => `
                                        <span onclick="updateStatus(${wIdx},'${task.name}',${s})" 
                                              class="${task.status === s ? 'active' : ''}"
                                              style="background:var(--${['red','orange','yellow','green'][s]}); color:var(--${['red','orange','yellow','green'][s]})">
                                        </span>
                                    `).join('')}
                                </div>
                                <div style="display:flex; gap:5px;">
                                    <a href="${vscodeUrl}" ${onclick} class="vscode-btn">VS Code</a>
                                    <button class="preview-btn" onclick="previewLocalFile(${wIdx}, '${task.name}')">Preview</button>
                                    <button class="ws-btn" onclick="openEditorByName(${wIdx}, '${task.name}')">Workspace</button>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>`;
        });

        weekEl.innerHTML = `
            <div class="week-header">
                <span class="week-title">${week.title} ${week.folderNum ? `(${week.folderNum})` : ''}</span>
                <div style="display:flex; gap:8px;">
                    <button class="ws-btn" style="background:var(--accent); color:white; border:none;" onclick="addTask(${wIdx})">+ Task</button>
                    <button class="action-icon" onclick="editWeek(${wIdx})">✏️</button>
                    <button class="action-icon" onclick="deleteWeek(${wIdx})">🗑️</button>
                </div>
            </div>
            ${catHtml}`;
        container.appendChild(weekEl);
    });

    updateStats();
    renderNavigation();
    initSortables();
}

// --- FILE PREVIEW ---
async function previewLocalFile(wIdx, name) {
    if (!globalDirHandle) {
        alert("Click 'Scan Folders' first to allow file access this session!");
        return;
    }
    try {
        const folderName = studyData[wIdx].folderNum || String(wIdx).padStart(2, '0');
        const subDir = await globalDirHandle.getDirectoryHandle(folderName);
        const fileHandle = await subDir.getFileHandle(name);
        const file = await fileHandle.getFile();
        const content = await file.text();

        const modal = document.getElementById('editor-modal');
        const textarea = document.getElementById('task-code');
        
        textarea.value = content;
        textarea.readOnly = true;
        
        document.getElementById('editor-save-btn').style.display = 'none';
        document.getElementById('read-only-indicator').style.display = 'inline-block';
        modal.querySelector('.modal-content').classList.add('read-only-mode');
        document.getElementById('modal-task-name').innerText = name;
        
        modal.style.display = 'block';
        setTimeout(() => { updateEditor(); syncScroll(); }, 50);
    } catch (err) {
        alert("File not found in folder: " + (studyData[wIdx].folderNum || wIdx));
    }
}

// --- WORKSPACE EDITOR ---
function openEditorByName(wIdx, name) {
    const tIdx = studyData[wIdx].tasks.findIndex(t => t.name === name);
    currentEditTask = { wIdx, tIdx };
    const task = studyData[wIdx].tasks[tIdx];

    const textarea = document.getElementById('task-code');
    textarea.value = task.code || "";
    textarea.readOnly = false;
    
    document.getElementById('editor-save-btn').style.display = 'inline-block';
    document.getElementById('read-only-indicator').style.display = 'none';
    document.getElementById('editor-modal').querySelector('.modal-content').classList.remove('read-only-mode');
    document.getElementById('modal-task-name').innerText = task.name + " (Workspace)";
    
    document.getElementById('editor-modal').style.display = 'block';
    setTimeout(() => { updateEditor(); syncScroll(); }, 50);
}

// --- SYNC ---
async function syncLocalFolder() {
    try {
        globalDirHandle = await window.showDirectoryPicker();
        for (let i = 0; i <= 12; i++) {
            const folderName = String(i).padStart(2, '0');
            try {
                const subDir = await globalDirHandle.getDirectoryHandle(folderName);
                let week = studyData.find(w => w.folderNum === folderName);
                if (!week) {
                    week = { title: `Week ${i}`, tasks: [], folderNum: folderName };
                    studyData.push(week);
                }
                for await (const entry of subDir.values()) {
                    if (entry.kind === 'file' && !entry.name.startsWith('.')) {
                        if (!week.tasks.some(t => t.name === entry.name)) {
                            week.tasks.push({ name: entry.name, status: 0, code: "" });
                        }
                    }
                }
            } catch (e) {}
        }
        studyData.sort((a,b) => (parseInt(a.folderNum) || 0) - (parseInt(b.folderNum) || 0));
        save(); renderList();
        alert("Folders Synced!");
    } catch (err) { alert("Access Denied."); }
}

// --- UI LOGIC ---
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

function saveEditor() {
    if(currentEditTask && !document.getElementById('task-code').readOnly) {
        studyData[currentEditTask.wIdx].tasks[currentEditTask.tIdx].code = document.getElementById('task-code').value;
        save();
    }
}
function closeEditor() { saveEditor(); document.getElementById('editor-modal').style.display = 'none'; }

function save() { 
    localStorage.setItem('codeMasteryData', JSON.stringify(studyData)); 
    updateStats();
}

function updateStatus(wIdx, name, s) {
    const tIdx = studyData[wIdx].tasks.findIndex(t => t.name === name);
    studyData[wIdx].tasks[tIdx].status = s;
    save(); renderList();
}

function addTask(wIdx) {
    const n = prompt("Task Name:");
    if(n) { studyData[wIdx].tasks.push({name: n.trim(), status: 0, code: ""}); save(); renderList(); }
}

function addWeek() {
    const t = prompt("Week Title:");
    if(t) { studyData.unshift({title: t, tasks: [], folderNum: ""}); save(); renderList(); }
}

function deleteWeek(wIdx) {
    if(confirm("Delete week?")) { studyData.splice(wIdx, 1); save(); renderList(); }
}

function deleteTask(wIdx, name) {
    if(confirm(`Delete ${name}?`)) {
        studyData[wIdx].tasks = studyData[wIdx].tasks.filter(t => t.name !== name);
        save(); renderList();
    }
}

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
            <div>🔴 Unknown: ${counts[0]}</div>
            <div>🟠 Theory: ${counts[1]}</div>
            <div>🟡 Buggy: ${counts[2]}</div>
            <div>🟢 Mastered: ${counts[3]}</div>`;
    }
}

function renderNavigation() {
    document.getElementById('week-nav-list').innerHTML = studyData.map((w, i) => `
        <div class="nav-item" onclick="document.getElementById('week-target-${i}').scrollIntoView({behavior:'smooth'})">
            📍 ${w.title || 'Untitled'}
        </div>`).join('');
}

// function toggleTheme() { document.body.classList.toggle('light-mode'); }
// Replace your toggleTheme function with this one
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    const themeLink = document.getElementById('prism-theme');
    
    if (isLight) {
        // Switch to the official Prism Light Theme
        themeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css";
    } else {
        // Switch back to Tomorrow Night (Dark)
        themeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css";
    }
}
function switchTab(t) {
    document.getElementById('list-view').style.display = t === 'list' ? 'block' : 'none';
    document.getElementById('converter-view').style.display = t === 'converter' ? 'block' : 'none';
}

function exportData() {
    const blob = new Blob([JSON.stringify(studyData)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup.json'; a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { studyData = JSON.parse(ev.target.result); save(); renderList(); };
    reader.readAsText(e.target.files[0]);
}

function resetAll() { if(confirm("Clear all?")) { studyData = []; save(); renderList(); } }

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






// --- RENAME TASK ---
function renameTask(wIdx, oldName) {
    const newName = prompt("Rename task:", oldName);
    
    // Check if user entered a name and it's not the same as the old one
    if (newName && newName.trim() !== "" && newName.trim() !== oldName) {
        const taskIdx = studyData[wIdx].tasks.findIndex(t => t.name === oldName);
        
        if (taskIdx !== -1) {
            studyData[wIdx].tasks[taskIdx].name = newName.trim();
            save();
            renderList();
        }
    }
}