const API = {
    // 🔴 DÁN LINK WEB APP CỦA BẠN VÀO DÒNG DƯỚI NÀY 🔴
    URL: "https://script.google.com/macros/s/AKfycbyijcgS6RkANDMopJ9ENEvsaPKWdP2bbK7BkgyxA6sg1Num1QAtbc6YNEfIEVuatku8Pg/exec",

    request: async function(method, action, sheetName, payload = null, rowIndex = null) {
        let url = `${this.URL}?action=${action}&sheetName=${sheetName}`;
        try {
            if (method === 'GET') {
                let res = await fetch(url);
                return await res.json();
            } else {
                let reqBody = { action: action, sheetName: sheetName, payload: payload, rowIndex: rowIndex };
                let res = await fetch(this.URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(reqBody)
                });
                return await res.json();
            }
        } catch (error) {
            console.error("Lỗi API:", error);
            return { status: 'error', message: 'Lỗi kết nối mạng' };
        }
    }
};