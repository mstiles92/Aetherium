import 'bootstrap/dist/js/bootstrap';
import * as firebase from 'firebase';
import 'jquery';
import Vue from 'vue';

import * as config from '../firebase.config';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/css/bootstrap-theme.css';
import './style.css';
import Aetherium from './modules/Aetherium.js';

import Timer from './templates/Timer.vue';
import Stats from './templates/Stats.vue';
import History from './templates/History.vue';

$(() => {
    window.vApp = new Vue({
        el: '#app',
        data: {
            aetherium: null,
            ui: {
                activeTab: 'timer',
                emailField: '',
                passwordField: '',
                puzzleSelection: 333,
                categorySelection: 'default'
            },
        },
        methods: {
            emailLogin: function(event) {
                firebase.auth().signInWithEmailAndPassword(vApp.ui.emailField, vApp.ui.passwordField).catch(function (error) {
                    alert(error.message);
                })
            },
            logout: function(event) {
                firebase.auth().signOut().then(() => {

                }).catch((error) => {
                    alert(error.message);
                })
            },
            runImport: function(event) {

            },
            runExport: function(event) {

            },
            onPuzzleModalOpen: function() {
                vApp.ui.puzzleSelection = vApp.aetherium.activePuzzle.key;
                vApp.ui.categorySelection = vApp.aetherium.activeCategory.key;
            },
            onPuzzleModalSave: function() {
                vApp.aetherium.setPuzzle(vApp.ui.puzzleSelection);
                vApp.aetherium.setCategory(vApp.ui.categorySelection);
            }
        },
        components: {
            'timer-view': Timer,
            'stats-view': Stats,
            'history-view': History
        }
    });

    try {
        firebase.initializeApp(config);
    } catch (e) {
        console.error(e);
    }

    vApp.aetherium = new Aetherium();

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            vApp.aetherium.handleLogin(user);
        } else {
            vApp.aetherium.handleLogout();
        }
    })
});