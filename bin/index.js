#!/usr/bin/env node
"use strict";

const path = require( "path" );
require( "dotenv" ).config( { path: path.join( __dirname, "..", ".env" ) } );
const client = require( "../src/client" );
const { Command } = require( "commander" );
const pkg = require( "../package.json" );

const program = new Command();

program
	.version( pkg.version )
	.description( "A tool for syncing Zendesk tickets to LeanKit" );

program
	.option( "-t, --ticket <ticket>", "manually sync one ticket" )
	.description( "Synchronize latest Zendesk tickets" )
	.action( async ( { ticket } ) => {
		if ( ticket === undefined ) {
			await client.syncTickets();
		} else {
			await client.syncTicket( ticket );
		}
	} );

program.parse( process.argv );
