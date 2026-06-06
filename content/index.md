---
title: 小浩日记
---
<div id="gate">  <h2>🔒 Private Journal</h2>  <input id="pw" type="password">  <button onclick="check()">Unlock</button>  <p id="msg"></p></div><script>
window.addEventListener("DOMContentLoaded", () => {

  const gate = document.getElementById("gate");

  if (localStorage.getItem("unlocked") === "true") {
    gate.style.display = "none";
  }

  window.check = function () {
    const pw = document.getElementById("pw").value;

    if (pw === "1234") {
      localStorage.setItem("unlocked", "true");
      gate.style.display = "none";
    } else {
      document.getElementById("msg").innerText = "wrong password";
    }
  };

});
</script>