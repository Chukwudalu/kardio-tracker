"use strict";
// prettier-ignore
const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];
class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);
    constructor(coords, distance, duration){
        this.coords = coords; // An array of lat and lng
        this.distance = distance; // km
        this.duration = duration; // min
    }
    _setDescription() {
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}
class Running extends Workout {
    type = "running";
    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }
    calcPace() {
        this.pace = this.duration / (this.distance / 60);
        return this.pace;
    }
}
class Cycling extends Workout {
    type = "cycling";
    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        this.speed = this.distance / this.duration;
        return this.speed;
    }
}
// -------------------------------------------------------------------------------------------------------------------------------
const sidebar = document.querySelector(".sidebar");
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const sidebarCancel = document.querySelector(".sidebar__cancelIcon");
const workoutsLocator = document.querySelector(".workouts__locator");
const inputType = document.querySelector(".form__input--type");
const dropInModalInfo = document.querySelector(".dropInModalInfo");
const dropInModalGuide = document.querySelector(".dropInModalGuide");
const dropInModalCancel = document.querySelectorAll(".dropInModal__cancel");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
// APPLICATION ARCHTECTURE
class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 13;
    constructor(){
        this.#getPosition();
        this.#getLocalStorage();
        form.addEventListener("submit", this.#newWorkOut.bind(this));
        inputType.addEventListener("change", this.#toggleElevationField);
        containerWorkouts.addEventListener("click", this.#moveToPopup.bind(this));
        sidebarCancel.addEventListener("click", this.#hideSidebar.bind(this));
        workoutsLocator.addEventListener("click", this.#showWorkouts.bind(this));
        this.#showDropInModal();
        this.#hideDropInModal();
        if (!this.#getFirstVisitFromLocalStorage()) window.addEventListener("load", this.#saveFirstVisitToLocalStorage.bind(this));
    }
     #getPosition() {
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(this.#loadMap.bind(this), geoError);
    }
     #loadMap(position) {
        const { latitude , longitude  } = position.coords;
        this.#map = L.map("map").setView([
            latitude,
            longitude
        ], this.#mapZoomLevel);
        L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        this.#map.on("click", this.#showForm.bind(this));
        this.#workouts.forEach((work)=>{
            this.#renderWorkoutMarker(work);
        });
    }
     #showForm(e) {
        this.#mapEvent = e;
        form.classList.remove("hidden");
        // This is for closing the sidebar
        sidebar.classList.remove("sidebar--hide");
        sidebar.classList.add("sidebar--show");
        // This is for hiding the workouts locator
        if (workoutsLocator.classList.contains("workouts__locator--show")) {
            workoutsLocator.classList.remove("workouts__locator--show");
            workoutsLocator.classList.add("workouts__locator--hide");
        }
        inputDistance.focus();
    }
     #hideSidebar(e1) {
        if (sidebar.classList.contains("sidebar--show")) {
            sidebar.classList.remove("sidebar--show");
            sidebar.classList.add("sidebar--hide");
        }
        if (workoutsLocator.classList.contains("workouts__locator--hide")) {
            workoutsLocator.classList.remove("workouts__locator--hide");
            workoutsLocator.classList.add("workouts__locator--show");
        }
    }
     #showWorkouts(e2) {
        if (workoutsLocator.classList.contains("workouts__locator--show")) {
            workoutsLocator.classList.remove("workouts__locator--show");
            workoutsLocator.classList.add("workouts__locator--hide");
        }
        if (!form.classList.contains("hidden")) form.classList.add("hidden");
        sidebar.classList.remove("sidebar--hide");
        sidebar.classList.add("sidebar--show");
    }
     #toggleElevationField() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }
     #newWorkOut(e3) {
        const validInputs = (...inputs)=>inputs.every((el)=>Number.isFinite(el));
        const positiveInputs = (...inputs)=>inputs.every((el)=>el > 0);
        e3.preventDefault();
        const { lat , lng  } = this.#mapEvent.latlng;
        const parent = e3.target.closest(".dropInModal");
        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        let workout;
        // If workout is running, create a running object
        if (type === "running") {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if (!validInputs(distance, duration, cadence) || !positiveInputs(distance, duration, cadence)) return alert("Inputs have to be a positive number");
            workout = new Running([
                lat,
                lng
            ], distance, duration, cadence);
        }
        // If workout is cycling, create a cycling object
        if (type === "cycling") {
            const elevation = +inputElevation.value;
            // Check if data is valid
            if (!validInputs(distance, duration, elevation) || !positiveInputs(distance, duration, elevation)) return alert("Inputs have to be a positive number");
            workout = new Cycling([
                lat,
                lng
            ], distance, duration, elevation);
        }
        // Add new object to workout array
        this.#workouts.push(workout);
        // Render workout on map as a marker
        this.#renderWorkoutMarker(workout);
        // Render workout on the list
        this.#renderWorkout(workout);
        // Hide the form and clear the input fields
        this.#hideForm();
        // Set LocalStorage
        this.#setLocalStorage();
        // Clear Input fields
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = "";
    // Display marker
    }
     #renderWorkoutMarker(workout1) {
        L.marker(workout1.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 300,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout1.type}-popup`
        })).setPopupContent(`${workout1.type === "running" ? "\uD83C\uDFC3‍♂️" : "\uD83D\uDEB4‍♀️"} ${workout1.description}`).openPopup();
    }
     #renderWorkout(workout2) {
        let html = `
            <li class="workout" data-id="${workout2.id}">
                <h2 class="workout__title">${workout2.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout2.type === "running" ? "\uD83C\uDFC3‍♂️" : "\uD83D\uDEB4‍♀️"}</span>
                    <span class="workout__value">${workout2.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout2.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
            
        `;
        if (workout2.type === "running") html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${workout2.pace.toFixed(1)}</span>
                        <span class="workout__unit">min/km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">🦶🏼</span>
                        <span class="workout__value">${workout2.cadence}</span>
                        <span class="workout__unit">spm</span>
                    </div>
                </li>
            `;
        if (workout2.type === "cycling") html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${workout2.speed.toFixed(1)}</span>
                        <span class="workout__unit">km/h</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">⛰</span>
                        <span class="workout__value">${workout2.elevationGain}</span>
                        <span class="workout__unit">m</span>
                    </div>
                </li>
            `;
        form.insertAdjacentHTML("afterend", html);
    }
     #hideForm() {
        // Empty Inputs
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = "";
        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(()=>form.style.display = "grid", 1000);
    }
     #moveToPopup(e4) {
        const workoutEl = e4.target.closest(".workout");
        if (!workoutEl) return;
        const workout3 = this.#workouts.find((work)=>work.id === workoutEl.dataset.id);
        this.#map.setView(workout3.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }
     #setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }
     #getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));
        if (!data) return;
        this.#workouts = data;
        this.#workouts.forEach((work)=>{
            this.#renderWorkout(work);
        });
    }
     #showDropInModal() {
        if (this.#getFirstVisitFromLocalStorage()) return;
        window.addEventListener("load", function() {
            setTimeout(()=>{
                if (dropInModalGuide.classList.contains("dropInModalGuide--hide")) {
                    dropInModalGuide.classList.remove("dropInModalGuide--hide");
                    dropInModalGuide.classList.add("dropInModalGuide--show");
                }
                if (dropInModalInfo.classList.contains("dropInModalInfo--hide")) {
                    dropInModalInfo.classList.remove("dropInModalInfo--hide");
                    dropInModalInfo.classList.add("dropInModalInfo--show");
                }
            }, 4000);
        });
    }
     #hideDropInModal() {
        dropInModalCancel.forEach((el)=>{
            el.addEventListener("click", function(e) {
                const parent = e.target.closest(".dropInModal");
                if (!parent) return;
                // remove the modals from the screen
                if (parent.classList.contains("dropInModalInfo--show")) {
                    parent.classList.remove("dropInModalInfo--show");
                    parent.classList.add("dropInModalInfo--hide");
                }
                if (parent.classList.contains("dropInModalGuide--show")) {
                    parent.classList.remove("dropInModalGuide--show");
                    parent.classList.add("dropInModalGuide--hide");
                }
            });
        });
    }
     #saveFirstVisitToLocalStorage() {
        localStorage.setItem("visited-kardio-tracker", true);
    }
     #getFirstVisitFromLocalStorage() {
        return localStorage.getItem("visited-kardio-tracker");
    }
    reset() {
        localStorage.removeItem("workouts");
        location.reload();
    }
}
const app = new App();
function geoError() {
    alert("could not get your position");
}

//# sourceMappingURL=index.672d4772.js.map
