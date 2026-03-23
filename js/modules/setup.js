// js/modules/setup.js

const SetupModule = {
    currentCategory: 'NGUỒN TIỀN/KHÁCH',
    Headers: ["NGUỒN TIỀN/KHÁCH", "ĐỐI TÁC GIA CÔNG", "NGUỒN HÀNG/NCC", "PHÂN LOẠI THU", "PHÂN LOẠI CHI", "TÊN VẬT TƯ"],

    load: async function() {
        await this.fetchData();
        this.switchCategory(); 
    },

    fetchData: async function() {
        const tbody = document.getElementById('tbody-setup');
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted p-4">⏳ Đang kéo dữ liệu...</td></tr>';
        
        let res = await API.request('GET', 'read', 'SETUP');
        if (res.status === 'success') {
            App.State.setupData = res.data;
        } else tbody.innerHTML = `<tr><td colspan="2" class="text-center text-danger p-4">❌ ${res.message}</td></tr>`;
    },

    switchCategory: function() {
        const select = document.getElementById('setup-category');
        this.currentCategory = select.value;
        document.getElementById('setup-category-name').innerText = select.options[select.selectedIndex].text;
        this.renderTable();
    },

    // ================= TÍNH NĂNG MỚI: KIỂM TRA TRÙNG TÊN =================
    checkNameExist: function(newName) {
        if (!App.State.setupData) return false;
        let isExist = false;
        let nameLower = newName.trim().toLowerCase();
        
        App.State.setupData.forEach(row => {
            this.Headers.forEach(col => {
                if (row[col] && row[col].toString().trim().toLowerCase() === nameLower) {
                    isExist = true;
                }
            });
        });
        return isExist;
    },
    // =====================================================================

    renderTable: function() {
        const data = App.State.setupData || [];
        const tbody = document.getElementById('tbody-setup');
        let html = '';

        data.forEach(row => {
            let val = row[this.currentCategory];
            if (val && val.trim() !== "") {
                html += `
                <tr>
                    <td class="ps-3 align-middle fw-bold text-teal">${val}</td>
                    <td class="text-end pe-3 align-middle">
                        <button class="btn btn-outline-warning btn-sm border-0" onclick="SetupModule.editItem(${row._rowIndex}, '${val}')" title="Sửa">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm border-0" onclick="SetupModule.deleteItem(${row._rowIndex})" title="Xóa">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </td>
                </tr>`;
            }
        });

        if(html === '') html = '<tr><td colspan="2" class="text-center text-muted p-4">Chưa có dữ liệu.</td></tr>';
        tbody.innerHTML = html;
    },

    addItem: async function(e) {
        e.preventDefault();
        const input = document.getElementById('setup-new-item');
        const val = input.value.trim();
        const btnAdd = document.getElementById('btn-add-setup');
        if (!val) return;

        // CHẶN NGAY TỪ ĐẦU NẾU TRÙNG TÊN
        if (this.checkNameExist(val)) {
            alert(`⚠️ Tên "${val}" đã tồn tại trong danh bạ Xưởng (Bao gồm cả Khách/Thợ/Vật tư). Vui lòng đổi tên khác để tránh nhầm lẫn!`);
            return;
        }

        btnAdd.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang đẩy lên mây...';
        btnAdd.disabled = true;

        let targetRow = App.State.setupData.find(r => !r[this.currentCategory] || r[this.currentCategory] === "");

        if (targetRow) {
            let rowIndex = targetRow._rowIndex;
            let payload = this.Headers.map(h => {
                if (h === this.currentCategory) return val;
                return targetRow[h] !== undefined ? targetRow[h] : ""; 
            });
            let res = await API.request('POST', 'update', 'SETUP', payload, rowIndex);
            if (res.status === 'success') {
                targetRow[this.currentCategory] = val; 
                input.value = ''; this.renderTable();
            } else alert('Lỗi: ' + res.message);
        } else {
            let payload = ["", "", "", "", "", ""];
            let colIndex = this.Headers.indexOf(this.currentCategory);
            payload[colIndex] = val; 
            let res = await API.request('POST', 'create', 'SETUP', payload);
            if (res.status === 'success') {
                App.State.setupData.push({ _rowIndex: res.rowIndex, [this.currentCategory]: val });
                input.value = ''; this.renderTable(); 
            } else alert('Lỗi: ' + res.message);
        }

        btnAdd.innerHTML = '<i class="bi bi-plus-lg me-1"></i>Thêm';
        btnAdd.disabled = false;
    },

    editItem: async function(rowIndex, oldVal) {
        let newVal = prompt(`Sửa tên "${oldVal}" thành:`, oldVal);
        if (newVal === null || newVal.trim() === "" || newVal.trim() === oldVal) return;
        
        // CHẶN TRÙNG TÊN KHI SỬA
        if (this.checkNameExist(newVal)) {
            alert(`⚠️ Tên "${newVal}" đã tồn tại. Vui lòng đặt tên khác!`);
            return;
        }

        await this.updateCell(rowIndex, newVal.trim(), oldVal); 
    },

    deleteItem: async function(rowIndex) {
        if (!confirm('⚠️ Xóa mục này khỏi danh sách?')) return;
        await this.updateCell(rowIndex, "");
    },

    updateCell: async function(rowIndex, newValue, oldValue = null) {
        const rowData = App.State.setupData.find(r => r._rowIndex === rowIndex);
        if(!rowData) return alert("Không tìm thấy dữ liệu gốc!");

        let payload = this.Headers.map(h => {
            if (h === this.currentCategory) return newValue;
            return rowData[h] !== undefined ? rowData[h] : ""; 
        });

        const isRowEmpty = payload.every(v => v === "");

        const titleEl = document.getElementById('setup-category-name');
        const originalText = titleEl.innerText;
        titleEl.innerHTML = originalText + ' <span id="setup-spinner" class="spinner-border spinner-border-sm text-warning ms-2"></span>';

        let res;
        if (isRowEmpty) {
            res = await API.request('POST', 'delete', 'SETUP', null, rowIndex);
        } else {
            res = await API.request('POST', 'update', 'SETUP', payload, rowIndex);
        }

        if (res.status === 'success') {
            if (isRowEmpty) {
                App.State.setupData = App.State.setupData.filter(r => r._rowIndex !== rowIndex);
            } else {
                let targetRow = App.State.setupData.find(r => r._rowIndex === rowIndex);
                if (targetRow) targetRow[this.currentCategory] = newValue;

                // NẾU LÀ ĐỔI TÊN KHÁCH/THỢ/NCC -> GỌI API ĐỔI TÊN Ở THU CHI
                if (oldValue && (this.currentCategory.includes('KHÁCH') || this.currentCategory.includes('ĐỐI TÁC') || this.currentCategory.includes('NCC'))) {
                    // Dùng await để ép nó chờ đổi tên xong mới đi tiếp
                    let renameRes = await API.request('POST', 'renamePartner', 'THU_CHI', {oldName: oldValue, newName: newValue});
                    if(renameRes.status === 'success') {
                        App.State.thuChiData = null; // Phá cache để Thu Chi tải lại tên mới
                    } else {
                        alert("Sửa tên thành công nhưng cập nhật sổ Thu Chi thất bại: " + renameRes.message);
                    }
                }
            }
        } else alert('Lỗi: ' + res.message);

        const spinner = document.getElementById('setup-spinner');
        if(spinner) spinner.remove();
        this.renderTable();
    }
};