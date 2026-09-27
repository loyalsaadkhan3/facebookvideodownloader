chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action !== "saveBlob" || !message.url) return;

  chrome.downloads.download({
    url: message.url,
    filename: message.filename || "facebook-video.mp4",
    saveAs: false,
    conflictAction: "uniquify"
  }).then(() => {
    sendResponse({ok:true});
  }).catch(error => {
    sendResponse({ok:false, error:String(error)});
  });

  return true;
});