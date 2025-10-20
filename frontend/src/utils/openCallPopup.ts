export function openCallPopup(callId: string, initiatorId?: string, isInitiator?: boolean) {
  const origin = window.location.origin;
  const params = new URLSearchParams();
  if (initiatorId) {
    params.set('initiator', initiatorId);
  }
  if (isInitiator !== undefined) {
    params.set('isInitiator', isInitiator.toString());
  }
  // Use the main call route
  const url = `${origin}/call/${encodeURIComponent(callId)}${params.toString() ? '?' + params.toString() : ''}`;
  
  console.log("[DEBUG] openCallPopup called with:", {
    callId,
    initiatorId,
    isInitiator,
    generatedUrl: url,
    params: Object.fromEntries(params.entries())
  });
  
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


