// Fixed list of service categories offered as chips on the request form -
// there's no backend-side "service type" master list, this is presentation
// only (folded into the free-text `title` field the real pop-sop-requests
// endpoint expects - see EOSbackend1/src/modules/pop-sop-requests).
export const sopServiceTypes = [
  "AC repair",
  "Fan",
  "Light",
  "Electrical",
  "Plumbing",
  "Projector",
  "Furniture",
  "Network",
  "Housekeeping",
];
