// === Constants ===
const BASE = "https://fsa-crud-2aa9294fe819.herokuapp.com/api";
const COHORT = "/2507"; // change to your cohort if needed
const API = BASE + COHORT;

// === State ===
let parties = [];
let selectedParty;
let rsvps = [];
let guests = [];

/** Updates state with all parties from the API */
async function getParties() {
  try {
    const res = await fetch(`${API}/events`);
    const result = await res.json();
    parties = result.data
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    render();
  } catch (e) {
    console.error(e);
  }
}

/** Updates state with a single party from the API */
async function getParty(id) {
  try {
    const res = await fetch(`${API}/events/${id}`);
    const result = await res.json();
    selectedParty = result.data;
    render();
  } catch (e) {
    console.error(e);
  }
}

/** Updates state with all RSVPs from the API */
async function getRsvps() {
  try {
    const res = await fetch(`${API}/rsvps`);
    const result = await res.json();
    rsvps = result.data;
    render();
  } catch (e) {
    console.error(e);
  }
}

/** Updates state with all guests from the API */
async function getGuests() {
  try {
    const res = await fetch(`${API}/guests`);
    const result = await res.json();
    guests = result.data;
    render();
  } catch (e) {
    console.error(e);
  }
}

/** Create a new party (POST /events) */
async function createParty(party) {
  const res = await fetch(`${API}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(party),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create failed (${res.status}): ${text}`);
  }
  return res.json();
}

/** Delete a party (DELETE /events/:id) */
async function deleteParty(id) {
  const res = await fetch(`${API}/events/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed (${res.status}): ${text}`);
  }
}

// === Components ===

/** Party name that shows more details about the party when clicked */
function PartyListItem(party) {
  const $li = document.createElement("li");
  if (party.id === selectedParty?.id) $li.classList.add("selected");

  $li.innerHTML = `<a href="#selected">${party.name}</a>`;
  $li.addEventListener("click", () => getParty(party.id));
  return $li;
}

/** A list of names of all parties */
function PartyList() {
  const $ul = document.createElement("ul");
  $ul.classList.add("parties");
  $ul.replaceChildren(...parties.map(PartyListItem));
  return $ul;
}

/** List of guests attending the selected party */
function GuestList() {
  const $ul = document.createElement("ul");
  if (!selectedParty) return $ul;

  const guestsAtParty = guests.filter((guest) =>
    rsvps.find(
      (rsvp) => rsvp.guestId === guest.id && rsvp.eventId === selectedParty.id
    )
  );

  const $guests = guestsAtParty.map((guest) => {
    const $li = document.createElement("li");
    $li.textContent = guest.name;
    return $li;
  });
  $ul.replaceChildren(...$guests);
  return $ul;
}

/** New party form */
function NewPartyForm() {
  const $form = document.createElement("form");
  $form.innerHTML = `
    <h2>Add a New Party</h2>
    <label>
      Name
      <input name="name" type="text" required />
    </label>
    <label>
      Description
      <textarea name="description" required></textarea>
    </label>
    <label>
      Date
      <input name="date" type="date" required />
    </label>
    <label>
      Location
      <input name="location" type="text" required />
    </label>
    <button type="submit">Create Party</button>
  `;

  // Optional: prevent past dates
  const dateInput = $form.querySelector('input[name="date"]');
  if (dateInput)
    dateInput.setAttribute("min", new Date().toISOString().slice(0, 10));

  $form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = $form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; // prevent double submit

    const fd = new FormData($form);
    const payload = {
      name: fd.get("name").trim(),
      description: fd.get("description").trim(),
      date: new Date(fd.get("date")).toISOString(),
      location: fd.get("location").trim(),
    };

    try {
      const { data: created } = await createParty(payload); // capture created party
      await getParties(); // refresh list (sorted)
      selectedParty = created; // auto-select the new one
      render(); // show it in details
      $form.reset();
    } catch (err) {
      console.error(err);
      alert("Could not create party. Check the date and try again.");
    } finally {
      submitBtn.disabled = false; // re-enable either way
    }
  });

  return $form;
}

/** Detailed information about the selected party (with Delete) */
function SelectedParty() {
  if (!selectedParty) {
    const $p = document.createElement("p");
    $p.textContent = "Please select a party to learn more.";
    return $p;
  }

  const $party = document.createElement("section");
  $party.innerHTML = `
    <h3>${selectedParty.name} #${selectedParty.id}</h3>
    <time datetime="${selectedParty.date}">
      ${selectedParty.date.slice(0, 10)}
    </time>
    <address>${selectedParty.location}</address>
    <p>${selectedParty.description}</p>
    <div style="margin:.5rem 0;">
      <button id="delete-party">Delete Party</button>
    </div>
    <GuestList></GuestList>
  `;

  $party.querySelector("GuestList").replaceWith(GuestList());

  $party.querySelector("#delete-party").addEventListener("click", async () => {
    if (!confirm(`Delete "${selectedParty.name}"? This cannot be undone.`))
      return;
    try {
      await deleteParty(selectedParty.id);
      selectedParty = undefined; // clear selection
      await getParties(); // refresh list
      render();
    } catch (err) {
      console.error(err);
      alert("Could not delete party. Try again.");
    }
  });

  return $party;
}

// === Render ===
function render() {
  const $app = document.querySelector("#app");

  const isAnyLoading = loading.parties || loading.rsvps || loading.guests;

  $app.innerHTML = `
    <h1>Party Planner</h1>
    ${errorMsg ? `<p role="alert" style="color:#b00;">${errorMsg}</p>` : ""}
    ${isAnyLoading ? `<p>Loading data…</p>` : ""}
    <main ${isAnyLoading ? 'aria-busy="true"' : ""}>
      <section>
        <NewPartyForm></NewPartyForm>
        <h2>Upcoming Parties</h2>
        <PartyList></PartyList>
      </section>
      <section id="selected">
        <h2>Party Details</h2>
        <SelectedParty></SelectedParty>
      </section>
    </main>
  `;

  $app.querySelector("NewPartyForm").replaceWith(NewPartyForm());
  $app.querySelector("PartyList").replaceWith(PartyList());
  $app.querySelector("SelectedParty").replaceWith(SelectedParty());
}

async function init() {
  await getParties();
  await getRsvps();
  await getGuests();
  render();
}

init();
