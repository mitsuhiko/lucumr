// The blog's look: the landscape of "Ridgeline and strata" in the header and
// the notebook page of "Sketchbook margins" in the footer.  Both stay
// selectable on their own (with their own header and footer); this only
// puts the two halves together.  Load it after strata.js and sketchbook.js.
LucumrArt.combine('ridgeline', {
  title: 'Ridgeline over sketchbook (the blog)',
  header: 'strata',
  footer: 'sketchbook'
});
