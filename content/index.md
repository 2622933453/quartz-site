---
title: 小浩日记
---
<div style="height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="text-align:center;">
    <h2>🔒 Private Journal</h2>

    <input id="pw" type="password" placeholder="password">
    <br><br>
    <button onclick="check()">Unlock</button>

    <p id="msg"></p>
  </div>
</div>

<script>
function check() {
  const pw = document.getElementById("pw").value;

  if (pw === "1234") {
    document.body.innerHTML = "<h2>Entering...</h2>";
    setTimeout(() => {
      window.location.href = "./diary";
    }, 500);
  } else {
    document.getElementById("msg").innerText = "Wrong password";
  }
}
</script>

