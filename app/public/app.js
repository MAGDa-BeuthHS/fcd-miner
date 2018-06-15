  /*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*/
  ///////////Initialisation of the connections and vairables////////////
  /*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*/

//Initalisation of the connection with the server of the app which is listening on port 4000
var socket = io.connect('http://localhost:4000');

//Declaration and initialisation of the variables which will be used in this application
    //The goal of this counter is to reduce the number of point the User can create on the map
    var pointCounter = 0;
    //The following coordinate are the ones of the points the user create the value is automaticly change by creating the points
    var Ax=10;
    var Ay=10;
    var Bx=20;
    var By=20;
    var Cx=10;
    var Cy=10;
    var Dx=10;
    var Dy=10;
    var Ex=10;
    var Ey=10;
    //Creation of the markers : Leaflet related
    var A=L.marker([0, 0]);
    var B=L.marker([0, 0]);
    var C=L.marker([0, 0]);
    var D=L.marker([0, 0]);
    var E=L.marker([0, 0]);
    //Creation of the bounds to block the users view to Dresden : Leaflet related
    var botWest = L.latLng(50.924698, 13.404035); 
    var topEast = L.latLng(51.155197, 14.059008); 
    var mybounds=L.latLngBounds(botWest, topEast);
    //Create variable who are linked to some div of the HTML code
    var startbtn = document.getElementById('start');
    var start = document.getElementById('startmenu');
    var alertbtn = document.getElementById('alertbtn');
    var alert = document.getElementById('alert');
    var resultbtn = document.getElementById('resultbtn');
    var result = document.getElementById('result');
    var timebtn = document.getElementById("time");
    var timebtn2 = document.getElementById("time2");
    var carte = document.getElementById("map");
    var precisionbtn = document.getElementById("count");
    var helpmenu = document.getElementById("help");
    var helpbtn = document.getElementById("helpbtn");
    var easyMenu = document.getElementById("easyMenu");
    var complexMenu = document.getElementById("complexMenu");
    var complexitybtn = document.getElementById("complexitybtn");
    var querybtn = document.getElementById("query");
    var complexquerybtn = document.getElementById("complexquery");
    var loading=Boolean(0);
    //Creation of the different layer of the map : Leaflet related
    var tracksLayer;
    var layer=L.tileLayer('https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png', {
        attribution: 'Map tiles by CartoDB, under CC BY 3.0. Data by OpenStreetMap, under ODbL.'
    });
    //Global variables
    var time;
    var precision=10;
    var complexitychoice;
    //These styles are made for change the tracks display on mouse over for create a cool User interface : some are dedicated to colors some to sizes
    var highlightStyle = {
        color: '#007dc6', 

        opacity: 1
    };

    var speedyStyle = {
        color: '#00c62b', 
        opacity: 0.6
    };

    var normalStyle = {
        color: '#ff7b00', 
        opacity: 0.6
    };

    var slowStyle = {
        color: '#ff0000', 
        opacity: 0.6
    };

    var smallStyle = {
        weight: 3
    };

    var mediumStyle = {
        weight: 6
    };

    var bigStyle = {
        weight: 12
    };

    //Creation of different icons for the markers : Leaflet related
    var startIcon = L.icon({
        iconUrl: 'car.png',
    iconSize:     [50, 50] // size of the icon
});

    var endIcon = L.icon({
        iconUrl: 'flag.png',
    iconSize:     [50, 50] // size of the icon
});

    //Creation of the Map with different attributs, you can add more by look for the Leaflet Doc : Leaflet Related
    var map = L.map('map',{
        minZoom:14,
        maxBounds: mybounds,
        maxBoundsViscosity: 1.0,
        panInsideBounds: mybounds
    }).setView([51.05040880000001,13.737262099999953], 4);


    /*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*/
/////////Main code : Socket emition, reception and Functions//////////
/*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*//*/*/

//Add my layer named "Layer" to the map
layer.addTo(map);
carte.style.cursor = "pointer";
alert.style.visibility="hidden";
result.style.visibility="hidden";
helpmenu.style.visibility="hidden";
easyMenu.style.visibility="hidden";
complexMenu.style.visibility="hidden";
//If you click on the map whatever the click is this function is launched
body.onmousedown = function(event) {
    //If it is a right click remove points A & B and the tracks and reset the counter of markers
    if (event.which == 3 && loading==Boolean(0)) {
        map.removeLayer(A);
        map.removeLayer(B);
        map.removeLayer(C);
        map.removeLayer(D);
        map.removeLayer(E);
        if(tracksLayer){
        
                map.removeLayer(tracksLayer);
    }
        pointCounter=0;
    }
};

var count = 1;
var countEl = document.getElementById("count");


 //A function who create the markers when you click on the map work with the left click
 var addMarker = function(e) {
//-You can only set up two points in this app
pointCounter = pointCounter+1 ;  
if(pointCounter<=5){

    //-If it's the first point pointCounter has not been ingremented so is equal to Zero, there we extract the coordinate of the new point to use it in the code    
    if(pointCounter===1){
        Ax = e.latlng.lng;
        Ay = e.latlng.lat;
        A=L.marker([Ay, Ax], {icon: startIcon}).addTo(map);
    }
    //-If it's the second point pointCounter has been ingremented so is equal to One, there we extract the coordinate of the new point to use it in the code 
    if(pointCounter===2){
        Bx = e.latlng.lng;
        By = e.latlng.lat;
        B=L.marker([By, Bx], {icon: endIcon}).addTo(map);
        
    }else if(pointCounter>2){
        switch(pointCounter) {
                case 3:
                Cx = e.latlng.lng;
                Cy = e.latlng.lat;
                C=L.marker([Cy, Cx]).addTo(map);
                break;

                case 4:
                Dx = e.latlng.lng;
                Dy = e.latlng.lat;
                D=L.marker([Dy, Dx]).addTo(map);
                break;

                case 5:
                Ex = e.latlng.lng;
                Ey = e.latlng.lat;
                E=L.marker([Ey, Ex]).addTo(map);
                break;
            } 
//If there is to much points alert the user
};}else{
 alert.style.visibility="visible";
}
};
        //Creation of the link between the map and the function who add a marker
        map.on('click', addMarker);
        var q=function(){
            console.log(Ax);
            console.log(Ay);
            console.log(Bx);
            console.log(By);
            console.log(Cx);
            console.log(Cy);
            if(pointCounter>=2){
                if(complexitychoice=="Easy"){
        time = timebtn.options[timebtn.selectedIndex].value;
    }else{
        time = timebtn2.options[timebtn2.selectedIndex].value;
    }
                complexitychoice= complexitybtn.options[complexitybtn.selectedIndex].value;
                carte.style.cursor = "wait";
                precision=precisionbtn.value;

                socket.emit('query', {
                    Ax: Ax,
                    Ay: Ay,
                    Bx: Bx,
                    By: By,
                    Cx: Cx,
                    Cy: Cy,
                    Dx: Dx,
                    Dy: Dy,
                    Ex: Ex,
                    Ey: Ey,
                    time : time,
                    pointCounter: pointCounter,
                    precision : precision,
                    complexity : complexitychoice
                });
            }

        };

        querybtn.onclick=q;
        complexquerybtn.onclick=q;


        complexitybtn.onchange = function(){
            complexitychoice=complexitybtn.options[complexitybtn.selectedIndex].value;
            if(complexitychoice=="Easy"){
                easyMenu.style.visibility="visible";
                complexMenu.style.visibility="hidden";
            }else{
                complexMenu.style.visibility="visible";
                easyMenu.style.visibility="hidden";
            }
        };


//Link the action with the button from the pop up
startbtn.addEventListener('click',function(){
    start.style.visibility="hidden";
});

alertbtn.addEventListener('click',function(){
    alert.style.visibility="hidden";
});

resultbtn.addEventListener('click',function(){
    result.style.visibility="hidden";
});

helpbtn.addEventListener('click',function(){
    if(helpmenu.style.visibility=="visible"){
        helpmenu.style.visibility="hidden";
    }else{
        helpmenu.style.visibility="visible";
    }
});

//What to do when you receive a socket called 'response'
socket.on('response',function(data){
    var track = data.rer;
    var totalcount=0;
    if(tracksLayer){

                map.removeLayer(tracksLayer);
    }
    tracksLayer=L.geoJSON(track, {
        onEachFeature: function (feature, layer) { 

            totalcount=totalcount+feature.properties.f3;
        }


    });if(totalcount==0){
        map.removeLayer(A);
        map.removeLayer(B);
        pointCounter=0;
        result.style.visibility="visible";

        map.removeLayer(tracksLayer);
    }else{
        if(complexitychoice=="Complex" || complexitychoice=="Agregate"){
            var totalcountPrc=totalcount/100;
            tracksLayer=L.geoJSON(track, {
                onEachFeature: function (feature, layer) { 
                    var duration=(feature.properties.f5/60).toFixed(2);
                    if(complexitychoice=="Complex"){
                    layer.bindPopup('<h1>Informations</h1><p>Distance: '+feature.properties.f2+' Meters</p><p>Car count: '+feature.properties.f3+' </p><p>Avg Speed: '+feature.properties.f4+' km/h</p><p>Avg duration: '+duration+' Min</p>');
                    }else {
                                         layer.bindPopup('<h1>Informations</h1><p>Distance: '+feature.properties.f2+' Meters</p><p>Avg car count: '+feature.properties.f3+' </p><p>Avg Speed: '+feature.properties.f4+' km/h</p><p>Avg duration: '+duration+' Min</p>');
   
                    }
        //Time expected if you travel at the speed limit in a city
        var avgTimeTakenH=feature.properties.f5/3600;
        var avgSpeed=feature.properties.f4;
        var distanceMeter=feature.properties.f2;
        var count=feature.properties.f3;
        var avgTimeSEc=feature.properties.f5;
        
        var timeToTravel=(distanceMeter/1000)/avgSpeed;
        var timeToTravelSecond=timeToTravel*3600;
        var oneprc= avgTimeSEc/100;
        var prct= (timeToTravelSecond/oneprc);
        if(prct>=0 && prct<30){
            layer.setStyle(slowStyle);
            layer.on('mouseover', function (e) {
                this.openPopup();
                this.setStyle(highlightStyle);
                this.bringToFront();
            });
            layer.on('mouseout', function (e) {
                this.closePopup();
                this.setStyle(slowStyle);
            });


        }else if(prct>=30 && prct<70){
            layer.setStyle(normalStyle);
            layer.on('mouseover', function (e) {
                this.openPopup();
                this.setStyle(highlightStyle);
                this.bringToFront();
            });
            layer.on('mouseout', function (e) {
                this.closePopup();
                this.setStyle(normalStyle);
            });

        }else if(prct>=70){
            
            layer.setStyle(speedyStyle);
            layer.on('mouseover', function (e) {
                this.openPopup();
                this.setStyle(highlightStyle);
                this.bringToFront();
            });
            layer.on('mouseout', function (e) {
                this.closePopup();
                this.setStyle(speedyStyle);
            });
        }

        var sizePerc=(feature.properties.f3/totalcountPrc);
        if(complexitychoice=="Complex"){
        if (sizePerc>=0 && sizePerc<0.5) {//use tricky try to find the good écart
            layer.setStyle(smallStyle);
        } else if (sizePerc>=0.5 && sizePerc<2) {
            layer.setStyle(mediumStyle);
        }else if (sizePerc>=2) {
            layer.setStyle(bigStyle);
        }
        }else{
            if (sizePerc>=0 && sizePerc<40) {//use tricky try to find the good écart
            layer.setStyle(smallStyle);
        } else if (sizePerc>=40 && sizePerc<65) {
            layer.setStyle(mediumStyle);
        }else if (sizePerc>=65) {
            layer.setStyle(bigStyle);
        }

        }
    }


}).addTo(map);
        }else if(complexitychoice=="Easy"){
            var totalcountPrc=totalcount/100;
            tracksLayer=L.geoJSON(track, {
                onEachFeature: function (feature, layer) { 
                    var duration=(feature.properties.f5/60).toFixed(2);
                    var duration=feature.properties.f3;
                    var durationM=(duration/60).toFixed(2);

                    layer.bindPopup('<h1>Informations</h1><p>Distance: '+feature.properties.f2+' Meters</p><p>Duration: '+durationM+' minutes </p><p>Avg Speed: '+feature.properties.f4+' km/h</p>');
        //Time expected if you travel at the speed limit in a city
                    var Distance=feature.properties.f2;
                    var distanceKm=Distance/1000;
                    var avgSpeed=feature.properties.f4;
                    var expectedTime=distanceKm/avgSpeed;
                    var expectedTimeSc=expectedTime*3600
                    var oneprc=expectedTimeSc/100;
                    var prct=duration/oneprc;
                    console.log(prct);
                    if(prct>=0 && prct<120){
           

            layer.setStyle(speedyStyle);
            layer.on('mouseover', function (e) {
                this.openPopup();
                this.setStyle(highlightStyle);
                this.bringToFront();
            });
            layer.on('mouseout', function (e) {
                this.closePopup();
                this.setStyle(speedyStyle);
            });
           
        }else if(prct>=120 && prct<150){
            layer.setStyle(normalStyle);
            layer.on('mouseover', function (e) {
                this.openPopup();
                this.setStyle(highlightStyle);
                this.bringToFront();
            });
            layer.on('mouseout', function (e) {
                this.closePopup();
                this.setStyle(normalStyle);
            });

        }else if(prct>=150){
             
             layer.setStyle(slowStyle);
            layer.on('mouseover', function (e) {
                this.openPopup();
                this.setStyle(highlightStyle);
                this.bringToFront();
            });
            layer.on('mouseout', function (e) {
                this.closePopup();
                this.setStyle(slowStyle);
            });
            
        }

    }


}).addTo(map);
        }
    }
    carte.style.cursor = "pointer";
    loading=Boolean(0);

});