document.getElementById("submit").addEventListener("click", async () => {
  let fileContent1 = document.getElementById("fileContent1").textContent;
  let fileContent2 = document.getElementById("fileContent2").textContent;
  let fileContent3 = document.getElementById("fileContent3").textContent;
  let fileContent4 = document.getElementById("fileContent4").textContent;
  let filePath = document.getElementById("dropProcessZone").textContent;

  console.log(filePath);

  await window.electron.processExcel({
    fileContent1,
    fileContent2,
    fileContent3,
    fileContent4,
    filePath,
  });
});
