
(() => {
  const API = (window.CHAT_CONFIG?.API_BASE || "").replace(/\/$/, "");
  const $ = (id) => document.getElementById(id);

  const els = {
    connection: $("connection"),
    online: $("online"),
    messages: $("messages"),
    nameRow: $("name-row"),
    nickname: $("nickname"),
    saveName: $("save-name"),
    message: $("message"),
    send: $("send"),
    form: $("send-form"),
    notice: $("notice"),
    adminOpen: $("admin-open"),
    adminPanel: $("admin-panel"),
    adminClose: $("admin-close"),
    loginForm: $("login-form"),
    password: $("admin-password"),
    login: $("admin-login"),
    actions: $("admin-actions"),
    reset: $("reset-chat"),
    logout: $("admin-logout")
  };

  let nickname = localStorage.getItem("chat_nickname") || "";
  let socket = null;
  let reconnectTimer = null;
  let connectionId = 0;

  let adminToken = sessionStorage.getItem("chat_admin_token") || "";

  function note(text) {
    els.notice.textContent = text;
  }

  function timeLabel(value) {
    return new Date(value).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function renderMessage(m) {
    if (els.messages.querySelector(".empty")) {
      els.messages.innerHTML = "";
    }

    const item = document.createElement("article");
    item.className = "message";

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const name = document.createElement("span");
    name.className = "message-name";
    name.textContent = m.nickname;

    const time = document.createElement("time");
    time.className = "message-time";
    time.textContent = timeLabel(m.createdAt);

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = m.text;

    meta.append(name, time);
    item.append(meta, body);

    els.messages.append(item);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function setOnline(count) {
    els.online.textContent = `온라인 ${count}명`;
  }

  function connect() {
    if (!API || API.includes("YOUR-WORKER")) {
      note("config.js에 Worker 주소를 설정하세요.");
      return;
    }

    if (!nickname) {
      els.nameRow.hidden = false;
      els.message.disabled = true;
      els.send.disabled = true;
      return;
    }

    // 기존 재연결 타이머 제거
    clearTimeout(reconnectTimer);
    reconnectTimer = null;

    // 이전 WebSocket 연결 정리
    const previousSocket = socket;
    socket = null;

    if (previousSocket) {
      previousSocket.close();
    }

    // 현재 연결 식별 번호
    const currentConnectionId = ++connectionId;

    const wsUrl =
      API.replace(/^http/, "ws") +
      "/ws?nickname=" +
      encodeURIComponent(nickname);

    const currentSocket = new WebSocket(wsUrl);
    socket = currentSocket;

    currentSocket.addEventListener("open", () => {
      if (socket !== currentSocket) return;
      if (currentConnectionId !== connectionId) return;

      els.connection.classList.add("online");
      els.message.disabled = false;
      els.send.disabled = false;

      note("");
    });

    currentSocket.addEventListener("message", (event) => {
      if (socket !== currentSocket) return;
      if (currentConnectionId !== connectionId) return;

      let data;

      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "history") {
        els.messages.innerHTML = "";

        if (!data.messages.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "아직 메시지가 없습니다.";
          els.messages.append(empty);
        } else {
          data.messages.forEach(renderMessage);
        }
      } else if (data.type === "message") {
        renderMessage(data.message);
      } else if (data.type === "online") {
        setOnline(data.count);
      } else if (data.type === "reset") {
        els.messages.innerHTML = "";

        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "채팅 기록이 초기화되었습니다.";

        els.messages.append(empty);
      } else if (data.type === "error") {
        note(data.message || "오류가 발생했습니다.");
      }
    });

    currentSocket.addEventListener("close", () => {
      // 이전 연결의 close 이벤트라면 무시
      if (socket !== currentSocket) return;
      if (currentConnectionId !== connectionId) return;

      socket = null;

      els.connection.classList.remove("online");
      els.message.disabled = true;
      els.send.disabled = true;

      clearTimeout(reconnectTimer);

      reconnectTimer = setTimeout(() => {
        if (!socket && currentConnectionId === connectionId) {
          connect();
        }
      }, 2500);
    });

    currentSocket.addEventListener("error", () => {
      if (socket === currentSocket) {
        currentSocket.close();
      }
    });
  }

  // 닉네임 저장
  els.saveName.addEventListener("click", () => {
    const value = els.nickname.value.trim();

    if (!value) {
      return note("닉네임을 입력하세요.");
    }

    if (value.length > 20) {
      return note("닉네임은 20자 이하여야 합니다.");
    }

    nickname = value;

    localStorage.setItem("chat_nickname", nickname);

    els.nameRow.hidden = true;

    connect();
  });

  els.nickname.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      els.saveName.click();
    }
  });

  // 메시지 전송
  els.form.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = els.message.value.trim();

    if (!text) return;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
      type: "message",
      text
    }));

    els.message.value = "";
    els.message.focus();
  });

  // 관리자 패널
  els.adminOpen.addEventListener("click", () => {
    els.adminPanel.hidden = !els.adminPanel.hidden;
    updateAdminUI();
  });

  els.adminClose.addEventListener("click", () => {
    els.adminPanel.hidden = true;
  });

  function updateAdminUI() {
    els.login.hidden = !!adminToken;
    els.actions.hidden = !adminToken;
  }

  // 관리자 로그인
  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(API + "/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: els.password.value
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "로그인 실패");
      }

      adminToken = data.token;

      sessionStorage.setItem("chat_admin_token", adminToken);

      els.password.value = "";

      updateAdminUI();

      note("관리자 로그인 완료");
    } catch (err) {
      note(err.message);
    }
  });

  // 채팅 초기화
  els.reset.addEventListener("click", async () => {
    if (!confirm("모든 채팅 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    try {
      const res = await fetch(API + "/api/admin/reset", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + adminToken
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "초기화 실패");
      }

      note("채팅 기록을 초기화했습니다.");
    } catch (err) {
      note(err.message);
    }
  });

  // 관리자 로그아웃
  els.logout.addEventListener("click", () => {
    adminToken = "";

    sessionStorage.removeItem("chat_admin_token");

    updateAdminUI();

    note("로그아웃했습니다.");
  });

  // 초기 실행
  updateAdminUI();

  if (nickname) {
    els.nameRow.hidden = true;
    connect();
  } else {
    els.nameRow.hidden = false;
  }
})();
