/* Shows the Arabic brand name (بروف نت) next to the logo when the site language is Arabic. */
(function () {
    var lang = '';
    try { lang = localStorage.getItem('cc_lang') || ''; } catch (e) {}
    if (lang !== 'ar' && lang !== 'en') lang = /^ar/i.test(navigator.language || '') ? 'ar' : 'en';
    if (lang !== 'ar') return;
    document.querySelectorAll('.brand span').forEach(function (el) {
        if (el.textContent.trim() === 'provnet') el.textContent = 'بروف نت';
    });
})();
