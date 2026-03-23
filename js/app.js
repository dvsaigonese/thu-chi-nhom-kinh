const App = {
    // KHO LƯU TRỮ CHỐNG LAG (STATE)
    State: {
        setupData: null,
        thuChiData: null
    },

    init: function() {
        // Lắng nghe nút Back của trình duyệt/điện thoại
        window.addEventListener('popstate', (e) => {
            const pageId = e.state ? e.state.page : 'home';
            this.showPage(pageId);
        });

        // Đọc URL lúc mới vào trang để mở đúng chỗ
        const hash = window.location.hash.replace('#', '') || 'home';
        this.navigate(hash, true);
    },

    navigate: function(pageId, isInitialLoad = false) {
        if (!isInitialLoad) {
            history.pushState({ page: pageId }, '', `#${pageId}`);
        }
        this.showPage(pageId);
    },

    showPage: function(pageId) {
        // Ẩn tất cả, hiện trang được chọn
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(`page-${pageId}`);
        if(targetPage) targetPage.classList.add('active');

        // Đổi tên Header & Hiện nút Back
        const btnBack = document.getElementById('btn-back');
        const headerTitle = document.getElementById('header-title');

        if(pageId === 'home') {
            btnBack.style.display = 'none';
            headerTitle.innerText = 'Trạm Điều Khiển Xưởng';

            if(typeof DashboardModule !== 'undefined') DashboardModule.load();
        } else {
            btnBack.style.display = 'block';
            
            // ĐIỀU PHỐI: Gọi đúng file JS của từng trang
            if(pageId === 'setup') {
                headerTitle.innerText = 'Cài Đặt Hệ Thống';
                SetupModule.load(); // Gọi file setup.js
            }
            if(pageId === 'thuchi') {
                headerTitle.innerText = 'Sổ Quỹ Thu Chi';
                ThuChiModule.load(); // Gọi file thuchi.js
            }
            if(pageId === 'baocao') {
                headerTitle.innerText = 'Hồ Sơ Công Nợ';
                BaocaoModule.load();
            }
        }
    }
};

// Khởi động toàn bộ hệ thống
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});