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
  <input id="pw" type="password" placeholder="password">
  <br><br>
  <button onclick="check()">Unlock</button>

  <p id="msg"></p>
</div>

<script>
function check() {
  const pw = document.getElementById("pw").value;

  if (pw === "1234") {
    document.getElementById("msg").innerText = "OK";
  } else {
    document.getElementById("msg").innerText = "Wrong password";
  }
}
</script>
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