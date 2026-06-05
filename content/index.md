---
title: Private Journal
---

<style>
#content {
  display: none;
}

#gate {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
</style>

<div id="gate">
  <h2>🔒 Enter Password</h2>

  <input type="password" id="0601">
  <button onclick="check()">Unlock</button>

  <p id="msg" style="color:red;"></p>
</div>

<div id="content">
  <h1>欢迎来到日记</h1>
  <p>这里是你的内容入口</p>

  <a href="./diary">进入日记</a>
</div>

<script>
function check() {
  const pw = document.getElementById("0601").value;

  if (pw === "0601") {
    document.getElementById("gate").style.display = "none";
    document.getElementById("content").style.display = "block";
  } else {
    document.getElementById("msg").innerText = "密码错误";
  }
}
</script>