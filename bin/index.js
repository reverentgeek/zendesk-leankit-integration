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
	.option( "-q, --query-only", "list ticket returned by search" )
	.description( "Synchronize the latest Zendesk tickets to LeanKit" )
	.action( async ( { ticket, queryOnly } ) => {
		if ( queryOnly ) {
			const { ZENDESK_HOST: host } = process.env;
			const data = await client.getTickets();
			// console.log( data );
			const tickets = data.map( t => {
				return {
					id: t.id,
					update: t.updated_at,
					subject: t.subject,
					status: t.status,
					group_id: t.group_id,
					url: `https://${ host }.zendesk.com/agent/tickets/${ t.id }`
				};
			} );
			console.log( tickets );
			return;
		}
		if ( ticket === undefined ) {
			await client.syncTickets();
		} else {
			await client.syncTicket( ticket );
		}
	} );

program.parse( process.argv );
