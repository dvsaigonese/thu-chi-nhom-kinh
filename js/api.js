const API = {
    // 🔴 DÁN LINK WEB APP CỦA BẠN VÀO DÒNG DƯỚI NÀY 🔴
    URL: "https://script.google.com/macros/s/AKfycbzolF6dq4wJEu7fwEWJC7t3filrzaoj2HvcurBuDOfQrG8H3yR01EiQ5YYmHvwmZwA17A/exec",

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