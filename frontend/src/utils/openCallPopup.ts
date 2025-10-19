export function openCallPopup(callId: string, initiatorId?: string) {
  const origin = window.location.origin;
  const url = initiatorId 
    ? `${origin}/call/${encodeURIComponent(callId)}?initiator=${encodeURIComponent(initiatorId)}`
    : `${origin}/call/${encodeURIComponent(callId)}`;
  const features = [
    "noopener",
    "noreferrer",
    "resizable=yes",
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
    "width=1200",
    "height=800",
  ].join(",");
  const win = window.open(url, "videocall", features);
  return win || null;
}


