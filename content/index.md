---
title: 小浩日记
---
<div id="gate">  <h2>🔒 Private Journal</h2>  <input id="pw" type="password">  <button onclick="check()">Unlock</button>  <p id="msg"></p></div><script>if (localStorage.getItem("unlocked") === "true") {  document.getElementById("gate").style.display = "none";}function check() {  const pw = document.getElementById("pw").value;  if (pw === "1234") {    localStorage.setItem("unlocked", "true");    document.getElementById("gate").style.display = "none";  } else {    document.getElementById("msg").innerText = "wrong password";  }}</script>
```