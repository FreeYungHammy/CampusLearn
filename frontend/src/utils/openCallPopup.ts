export function openCallPopup(callId: string, initiatorId?: string, isInitiator?: boolean) {
  const origin = window.location.origin;
  const params = new URLSearchParams();
  if (initiatorId) {
    params.set('initiator', initiatorId);
  }
  if (isInitiator !== undefined) {
    params.set('isInitiator', isInitiator.toString());
  }
  const url = `${origin}/call/${encodeURIComponent(callId)}${params.toString() ? '?' + params.toString() : ''}`;
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


