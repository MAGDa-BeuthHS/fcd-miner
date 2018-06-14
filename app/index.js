var express = require('express');
var pg = require("pg");
var socket = require('socket.io');
// Setup connection

var username = "postgres" // sandbox username
var password = "" // read only privileges on our table
var host = ""
var database = "postgres" // database name
var conString = "postgres://"+username+":"+password+"@"+host+"/"+database; // Your Database Connection

var client = new pg.Client(conString);
if(client.connect()){
	console.log('Connected succesfully to the dabase');
}
//App setupvar 
var app = express();
var server = app.listen(4000, function(){
	console.log('App launch on port 4000');
});

//static file
app.use(express.static('public'));

//socket set up
var io = socket(server);
io.on('connection', function(socket){
	console.log('You re connected');
	socket.on('query', function(data){
			//map query
			var Ax=data.Ax;
			var Ay=data.Ay;
			var Bx=data.Bx;
			var By=data.By;
			var Cx=data.Cx;
			var Cy=data.Cy;
			var Dx=data.Dx;
			var Dy=data.Dy;
			var Ex=data.Ex;
			var Ey=data.Ey;
			var pointCounter=data.pointCounter;
			var time=data.time;
			var precision=data.precision;
			var complexity=data.complexity;
			var timestart;
			var timeend;
			switch(time) {
				case "Night":
				timestart=1;
				timeend=8;
				break;

				case "Morning":
				timestart=8;
				timeend=12;
				break;

				case "Afternoon":
				timestart=12;
				timeend=18;
				break;

				case "Evening":
				timestart=18;
				timeend=24;
				break;

				case "Day":
				timestart=1;
				timeend=24;
				break;

				default:
				timestart=1;
				timeend=24;
			} 

			var stringPoint="";
			switch(pointCounter){
				case 2 :
				stringPoint=" "+ Ax +"  "+ Ay +" ,  "+ Bx +"  "+ By +" ";
				break;

				case 3 :
				stringPoint=" "+ Ax +"  "+ Ay +" , "+ Cx +"  "+ Cy +",  "+ Bx +"  "+ By +" ";
				break;	

				case 4 :
				stringPoint=" "+ Ax +"  "+ Ay +" , "+ Cx +"  "+ Cy +", "+ Dx +"  "+ Dy +",  "+ Bx +"  "+ By +" ";
				break;

				case 5 :
				stringPoint=" "+ Ax +"  "+ Ay +" , "+ Cx +"  "+ Cy +", "+ Dx +"  "+ Dy +", "+ Ex +"  "+ Ey +",  "+ Bx +"  "+ By +" ";
				break;

			}
			if(complexity=="Easy"){
				var filter_query = "SELECT get_trip_geojson(ST_GeomFromText('MULTIPOINT(" + stringPoint + ")', 4326), 0.001, " + timestart + ", " + timeend + ", 5) as results;";

			}else if(complexity=="Complex"){
				var filter_query = "SELECT get_dumped_trip_agg_geojson(ST_GeomFromText('MULTIPOINT(" + stringPoint + ")', 4326), 0.001, " + timestart + ", " + timeend + ", " + precision +") as results;";

			}else{
				var filter_query = "SELECT get_trip_agg_geojson(ST_GeomFromText('MULTIPOINT(" + stringPoint + ")', 4326), 0.001, " + timestart + ", " + timeend + ", " + precision +") as results;";
			}
			var query = client.query(new pg.Query(filter_query));
			query.on("row", function (row, result) {
				result.addRow(row);
			});
			query.on("end", function (result) {
				var rer = result.rows[0].results; 
				socket.emit('response', {
					rer : rer}
					);
			});
		;
});
});