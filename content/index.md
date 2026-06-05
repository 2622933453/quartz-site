---
title: Private
---

<div id="gate">
  <input id="pw" type="password">
  <button onclick="check()">Unlock</button>
  <p id="msg"></p>
</div>

<script>
function check() {
  if (document.getElementById("pw").value === "1234") {
    document.getElementById("gate").style.display = "none";
  } else {
    document.getElementById("msg").innerText = "wrong";
  }
}
</script>