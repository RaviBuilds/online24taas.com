// WordPress stored dates with a +0 offset (site timezone was UTC), so the original site displayed the
// stored value as-is. We format in UTC to reproduce the same calendar dates.
const date = new Intl.DateTimeFormat('mr-IN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
// "Today" in the header is the reader's calendar day in India (the site's audience), not UTC.
const today = new Intl.DateTimeFormat('mr-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
export const formatDate = (iso?: string | null) => (iso ? date.format(new Date(iso)) : '');
export const formatLongDate = (d: Date = new Date()) => today.format(d);
