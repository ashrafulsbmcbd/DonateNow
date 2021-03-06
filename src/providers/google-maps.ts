import { Injectable } from '@angular/core';
import { Connectivity } from './connectivity';
import { Geolocation } from 'ionic-native';
import {NavController, NavParams} from 'ionic-angular';
import { App } from 'ionic-angular';
import { ListPage } from '../pages/list/list';
import {SearchPage} from '../pages/search/search';

declare var google;


@Injectable()
export class GoogleMaps {

  mapElement: any;
  pleaseConnect: any;
  map: any;
  mapInitialised: boolean = false;
  mapLoaded: any;
  mapLoadedObserver: any;
  markers: any = [];
  apiKey: string;

  constructor(public connectivityService: Connectivity, public app: App) {

  }

  /*get navCtrl(): NavController {
    return this.injector.get(NavController);
  }*/

  get navCtrl(): NavController {
   return this.app.getActiveNav();
}

  init(mapElement: any, pleaseConnect: any): Promise<any> {

    this.mapElement = mapElement;
    this.pleaseConnect = pleaseConnect;

    return this.loadGoogleMaps();

  }

  loadGoogleMaps(): Promise<any> {

    return new Promise((resolve) => {

      if(typeof google == "undefined" || typeof google.maps == "undefined"){

        console.log("Google maps JavaScript needs to be loaded.");

        this.disableMap();

        if(this.connectivityService.isOnline()){

          window['mapInit'] = () => {

            this.initMap().then(() => {
              resolve(true);
            });

            this.enableMap();
          }

          let script = document.createElement("script");
          script.id = "googleMaps";

          if(this.apiKey){
            script.src = 'http://maps.google.com/maps/api/js?key=' + this.apiKey + '&callback=mapInit';
          } else {
            script.src = 'http://maps.google.com/maps/api/js?callback=mapInit';
          }

          document.body.appendChild(script);

        }
      }
      else {

        if(this.connectivityService.isOnline()){
          this.initMap();
          this.enableMap();
        }
        else {
          this.disableMap();
        }

      }

      this.addConnectivityListeners();

    });

  }

  initMap(): Promise<any> {

    this.mapInitialised = true;

    return new Promise((resolve) => {

      Geolocation.getCurrentPosition().then((position) => {


        let latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

        //let latLng = new google.maps.LatLng(40.713744, -74.009056);

        let mapOptions = {
          center: latLng,
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        }

        this.map = new google.maps.Map(this.mapElement, mapOptions);
        resolve(true);
        google.maps.event.addListener(this.map, 'click', (event) => {
          this.clearMarkers();
          let geocoder = new google.maps.Geocoder;
          let infowindow = new google.maps.InfoWindow;
          let distanceToYou = this.getDistanceBetweenPoints(
            event.latLng,
            position,
            'miles'
          ).toFixed(2);
          this.geocodeLatLng(event.latLng,geocoder,infowindow,distanceToYou);
        });
      });

    });

  }

  disableMap(): void {

    if(this.pleaseConnect){
      this.pleaseConnect.style.display = "block";
    }

  }

  enableMap(): void {

    if(this.pleaseConnect){
      this.pleaseConnect.style.display = "none";
    }

  }

  addConnectivityListeners(): void {

    document.addEventListener('online', () => {

      console.log("online");

      setTimeout(() => {

        if(typeof google == "undefined" || typeof google.maps == "undefined"){
          this.loadGoogleMaps();
        }
        else {
          if(!this.mapInitialised){
            this.initMap();
          }

          this.enableMap();
        }

      }, 2000);

    }, false);

    document.addEventListener('offline', () => {

      console.log("offline");

      this.disableMap();

    }, false);

  }
  addMarker(lat: number, lng: number): void {

    let latLng = new google.maps.LatLng(lat, lng);

    let marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: latLng
    });

    this.markers.push(marker);

  }

  geocodeLatLng(latLng: any,geocoder: any, infowindow:any,distanceToYou: any): void{
    geocoder.geocode({'location': latLng}, (results, status) => {
      if (status === 'OK') {
        if (results[1]) {
          let marker = new google.maps.Marker({
            position: latLng,
            animation: google.maps.Animation.DROP,
            map: this.map
          });

          //
          // var contentString = "<div><button class='button button-clear button-positive' ng-click='clickTest()'>Click Me</button></div>";
          // var compiled = $compile(contentString)($scope);
          //
          //         var infowindow = new google.maps.InfoWindow({
          //           content: compiled[0]
          //         });
          //
          //         $scope.clickTest = function() {
          //                 alert('Example of infowindow with ng-click')
          //               };


          this.markers.push(marker);
        //  infowindow.setContent('<button style="font-size: 2.5em; color: light; font-weight: bold; background: NONE;" (onclick)="launchAddPage">BE DONOR</button>');
          infowindow.setContent(results[1].formatted_address+'<p style="color: red;">'+distanceToYou+" km away from your location</p>");
          infowindow.open(this.map, marker);
        } else {
          window.alert('No results found');
        }
      } else {
        window.alert('Geocoder failed due to: ' + status);
      }
    });
  }


  setMapOnAll(map) {
    for (var i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(map);
    }
  }
  clearMarkers() {
    this.setMapOnAll(null);
    this.markers = [];
  }

  getDistanceBetweenPoints(start, end, units){

    let earthRadius = {
      miles: 3958.8,
      km: 6371
    };

    let R = earthRadius[units || 'miles'];
    let lat1 = start.lat();
    let lon1 = start.lng();
    let lat2 = end.coords.latitude;
    let lon2 = end.coords.longitude;

    console.log(lat1 , lon1);





    let dLat = this.toRad((lat2 - lat1));
    let dLon = this.toRad((lon2 - lon1));
    let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    //mili km'ye cevirdim

    let d = (R * c) + 0.6;
    console.log('distanceToYou '+d);

    /* this.navCtrl.push(ListPage, {

    lat: lat1, lon: lon1
  }); */

  this.navCtrl.push(ListPage, {

  distance: d
});







    return d;
  }


  toRad(x){
    return x * Math.PI / 180;
  }
}
