/* Live visitors counter for the owner.
   - Every open page reports itself under presence/{random id}; the entry is removed automatically when the tab closes.
   - Only the owner (role stored in /roles/owner) can read that list, and only the owner sees the small button.
   - No personal data is stored: just a timestamp and the file name of the page that is open. */
(function () {
    if (window.__ccPresence) return;
    window.__ccPresence = true;

    var CFG = {
        apiKey: "AIzaSyBV93xGbKln5RcaPP9VOtlmh5auKD04Zms",
        authDomain: "creatitity-d09f7.firebaseapp.com",
        databaseURL: "https://creatitity-d09f7-default-rtdb.firebaseio.com",
        projectId: "creatitity-d09f7",
        storageBucket: "creatitity-d09f7.appspot.com",
        messagingSenderId: "591631410491",
        appId: "1:591631410491:web:ff000c0a8d2f030f57031e"
    };
    var BASE = 'https://www.gstatic.com/firebasejs/10.8.0/';
    var BEAT = 60000;      // each open page refreshes its timestamp every minute
    var FRESH = 180000;    // entries older than 3 minutes are ignored (crashed tabs, lost connection)

    var NAMES = {
        'index.html': ['Home', 'الرئيسية'], 'index-1.html': ['Installation', 'التركيب'],
        'index-2.html': ['Maintenance', 'الصيانة'], 'index-3.html': ['Administration', 'إدارة الشبكات'],
        'index-4.html': ['About us', 'من نحن'], 'index-5.html': ['Join', 'الانضمام'],
        'index-6.html': ['Dashboard page', 'لوحة التحكم'], 'index-7.html': ['Products', 'المنتجات'],
        'index-8.html': ['Price list page', 'الأسعار'], 'index-9.html': ['Admins page', 'الأدمنز'],
        'index-10.html': ['Account', 'الحساب'], 'index-11.html': ['My requests', 'طلباتي']
    };

    function rand() {
        var a = new Uint8Array(12), c = window.crypto || window.msCrypto;
        if (c && c.getRandomValues) c.getRandomValues(a);
        else for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256);
        return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
    var sid = rand();

    function pageName() {
        var f = (location.pathname.split('/').pop() || 'index.html').replace(/[^\w.\-]/g, '').slice(0, 60);
        return f || 'index.html';
    }
    function isOwner() { try { return sessionStorage.getItem('isOwner') === 'true'; } catch (e) { return false; } }
    function isAr() { return document.documentElement.lang === 'ar'; }

    /* ---------- load Firebase only if the page has not already ---------- */
    function have(name) {
        if (!window.firebase) return false;
        return name === 'app' ? !!firebase.initializeApp : !!firebase[name];
    }
    function ensureOne(name, file, cb) {
        if (have(name)) return cb();
        if (!document.querySelector('script[src*="' + file + '"]')) {
            var s = document.createElement('script');
            s.src = BASE + file;
            document.head.appendChild(s);
        }
        var waited = 0, t = setInterval(function () {
            waited += 100;
            if (have(name) || waited >= 10000) { clearInterval(t); cb(); }
        }, 100);
    }
    function db() {
        if (!firebase.apps.length) firebase.initializeApp(CFG);
        return firebase.database();
    }

    /* ---------- every visitor: report this open page ---------- */
    function report() {
        var d = db(), me = d.ref('presence/' + sid);
        function beat() {
            try { me.set({ t: firebase.database.ServerValue.TIMESTAMP, p: pageName() }).catch(function () {}); } catch (e) {}
        }
        d.ref('.info/connected').on('value', function (s) {
            if (s.val() !== true) return;
            me.onDisconnect().remove().then(beat).catch(function () {});
        });
        setInterval(beat, BEAT);
    }

    /* ---------- owner only: the small counter button ---------- */
    var running = false, seq = 0, widget = null, offFns = [], blockedUntil = 0;
    var els = {};

    function build() {
        if (widget) return;
        var w = document.createElement('div');
        w.id = 'ccLive';
        w.style.cssText = 'position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:850;' +
            'font:600 13px/1.4 system-ui,-apple-system,Segoe UI,Tahoma,sans-serif;direction:ltr;color:#e6eefc';
        var panel = document.createElement('div');
        panel.style.cssText = 'display:none;margin-bottom:8px;min-width:190px;max-width:260px;padding:10px 12px;border-radius:12px;' +
            'background:#12244a;border:1px solid rgba(255,255,255,.15);box-shadow:0 8px 24px rgba(0,0,0,.4);font-weight:600';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;border-radius:999px;cursor:pointer;' +
            'background:#12244a;color:#e6eefc;border:1px solid rgba(255,255,255,.15);box-shadow:0 4px 14px rgba(0,0,0,.35);font:inherit';
        var dot = document.createElement('span');
        dot.style.cssText = 'width:9px;height:9px;border-radius:50%;background:#34d399;box-shadow:0 0 0 3px rgba(52,211,153,.25)';
        var num = document.createElement('span');
        num.textContent = '…';
        var lab = document.createElement('span');
        lab.style.cssText = 'color:#9db2d6;font-weight:600';
        btn.appendChild(dot); btn.appendChild(num); btn.appendChild(lab);
        btn.addEventListener('click', function () { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });
        w.appendChild(panel); w.appendChild(btn);
        document.body.appendChild(w);
        widget = w; els = { panel: panel, num: num, lab: lab, btn: btn };
    }

    function render(map, offset) {
        if (!widget) return;
        var now = Date.now() + offset, total = 0, by = {};
        Object.keys(map || {}).forEach(function (k) {
            var v = map[k];
            if (!v || typeof v.t !== 'number' || now - v.t > FRESH) return;
            total++;
            var n = NAMES[v.p] ? NAMES[v.p][isAr() ? 1 : 0] : (isAr() ? 'أخرى' : 'Other');
            by[n] = (by[n] || 0) + 1;
        });
        var ar = isAr();
        els.num.textContent = String(total);
        els.lab.textContent = ar ? 'متصل الآن' : 'online now';
        els.btn.setAttribute('aria-label', (ar ? 'المتصلون الآن: ' : 'Visitors online: ') + total);
        els.panel.style.direction = ar ? 'rtl' : 'ltr';
        while (els.panel.firstChild) els.panel.removeChild(els.panel.firstChild);
        var head = document.createElement('div');
        head.style.cssText = 'color:#9db2d6;font-size:12px;margin-bottom:6px';
        head.textContent = ar ? 'الصفحات المفتوحة الآن (تشمل تابك)' : 'Pages open now (includes your tab)';
        els.panel.appendChild(head);
        var keys = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; });
        if (!keys.length) {
            var none = document.createElement('div');
            none.textContent = ar ? 'لا أحد' : 'Nobody';
            els.panel.appendChild(none);
        }
        keys.forEach(function (k) {
            var row = document.createElement('div');
            row.textContent = k + ': ' + by[k];
            els.panel.appendChild(row);
        });
    }

    function stopOwner() {
        seq++;
        running = false;
        offFns.forEach(function (f) { try { f(); } catch (e) {} });
        offFns = [];
        if (widget && widget.parentNode) widget.parentNode.removeChild(widget);
        widget = null; els = {};
    }

    function authReady() {
        if (window.ccUser && ccUser.ready) return ccUser.ready();
        return new Promise(function (resolve) {
            var off = firebase.auth().onAuthStateChanged(function (u) { off(); resolve(u); });
        });
    }

    function startOwner() {
        if (running || Date.now() < blockedUntil) return;
        running = true;
        var my = ++seq;
        ensureOne('auth', 'firebase-auth-compat.js', function () {
            if (my !== seq) return;
            if (!have('auth')) { running = false; blockedUntil = Date.now() + 30000; return; }
            authReady().then(function () {
                if (my !== seq || !isOwner()) { if (my === seq) running = false; return; }
                var d = db(), offset = 0;
                build();
                var offRef = d.ref('.info/serverTimeOffset');
                var offCb = offRef.on('value', function (s) { offset = s.val() || 0; });
                var ref = d.ref('presence');
                var cb = ref.on('value',
                    function (snap) { render(snap.val() || {}, offset); },
                    function () { stopOwner(); blockedUntil = Date.now() + 60000; });
                offFns.push(function () { ref.off('value', cb); offRef.off('value', offCb); });
            });
        });
    }

    function watchOwner() {
        function tick() { if (isOwner()) startOwner(); else if (running || widget) stopOwner(); }
        tick();
        setInterval(tick, 2000);
    }

    /* ---------- start ---------- */
    function start() {
        ensureOne('app', 'firebase-app-compat.js', function () {
            ensureOne('database', 'firebase-database-compat.js', function () {
                if (!have('database')) return;
                try { report(); } catch (e) {}
                watchOwner();
            });
        });
    }
    // small delay so pages that load Firebase themselves (or owner-bell.js) go first
    setTimeout(start, 800);
})();
