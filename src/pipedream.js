const axios = require( "axios" );

function formatCustomId( id ) {
	return `ZD: ${ id }`;
}

function formatReviewId( name, version ) {
	return `Review: ${ name } - ${ version }`;
}

function parseReviewTicket( description ) {
	const reviewExp = /App "(?<appName>[^"]*)" version "(?<version>[^"]*).* id: (?<account>[0-9]*)/gsm;
	const { groups: { appName, version, account } } = reviewExp.exec( description );
	return {
		appName,
		version,
		account
	};
}

async function closeAppReviewTicket( id ) {
	try {
		const {
			ZENDESK_API_TOKEN: token,
			ZENDESK_EMAIL: username,
			ZENDESK_HOST: host,
			ZENDESK_CUSTOM_FIELD_ID: customFieldId,
			ZENDESK_CUSTOM_FIELD_VALUE: customFieldValue } = process.env;

		const buff = Buffer.from( `${ username }/token:${ token }` );
		const encoded = buff.toString( "base64" );

		const config = {
			method: "put",
			url: `https://${ host }.zendesk.com/api/v2/tickets/${ id }`,
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Basic ${ encoded }`
			},
			data: 		{
				ticket: {
					status: "solved",
					custom_fields: [ { id: customFieldId, value: customFieldValue } ]
				}
			}
		};
		const res = await axios( config );
		return res.data;
	} catch ( err ) {
		console.log( err );
		return [];
	}
}

async function createCard( { subject, id, url, review = false, description = "" } ) {
	try {
		const {
			LK_HOST: host,
			LK_USERNAME: username,
			LK_PASSWORD: password,
			LK_BOARD_ID: boardId,
			LK_TYPE_ID: typeId,
			LK_LANE_ID: laneId,
			LK_REVIEW_LANE_ID: reviewLaneId,
			LK_REVIEW_TYPE_ID: reviewTypeId
		} = process.env;

		const config = {
			method: "post",
			url: `https://${ host }.leankit.com/io/card`,
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			auth: {
				username, password
			},
			data: {
				boardId,
				title: subject,
				description,
				typeId: review ? reviewTypeId : typeId,
				laneId: review ? reviewLaneId : laneId,
				customId: id,
				externalLink: {
					label: "Zendesk Ticket",
					url
				}
			}
		};

		const res = await axios( config );
		return res.data;

	} catch ( err ) {
		console.log( err );
		return "Error: " + err.message;
	}
}

async function discardCard( id ) {
	try {
		const {
			LK_HOST: host,
			LK_USERNAME: username,
			LK_PASSWORD: password,
			LK_DISCARD_LANE_ID: laneId
		} = process.env;

		const config = {
			method: "post",
			url: `https://${ host }.leankit.com/io/card/move`,
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			auth: {
				username, password
			},
			data: {
				cardIds: [ id ],
				destination: {
					laneId
				}
			}
		};

		const res = await axios( config );
		return res.data;

	} catch ( err ) {
		console.log( err );
		return "Error: " + err.message;
	}
}

async function getTickets() {
	try {
		const {
			ZENDESK_API_TOKEN: token,
			ZENDESK_EMAIL: username,
			ZENDESK_HOST: host,
			ZENDESK_DAYS_TO_CHECK: days,
			ZENDESK_STATUS_THRESHOLD: searchStatus } = process.env;

		const buff = Buffer.from( `${ username }/token:${ token }` );
		const encoded = buff.toString( "base64" );
		const dt = new Date();
		dt.setDate( dt.getDate() - days );
		const dtFilter = dt.toISOString().substring( 0, 10 );
		const search =`status<${ searchStatus } group:integrations created>${ dtFilter }`;

		const config = {
			method: "get",
			url: `https://${ host }.zendesk.com/api/v2/search.json?query=${ search }`,
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Basic ${ encoded }`
			}
		};
		const res = await axios( config );
		return res.data.results;
	} catch ( err ) {
		console.log( err );
		return [];
	}
}

async function getCardByCustomId( id ) {
	try {
		const {
			LK_HOST: host,
			LK_USERNAME: username,
			LK_PASSWORD: password
		} = process.env;

		const config = {
			method: "get",
			url: `https://${ host }.leankit.com/io/card/?customId=${ id }`,
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			auth: {
				username, password
			}
		};

		const res = await axios( config );
		return res.data.cards;

	} catch ( err ) {
		console.log( err );
		return [];
	}
}

const { ZENDESK_HOST: host } = process.env;
const tickets = await getTickets();
console.log( "total tickets to check:", tickets.length );
for( const { id, subject, description } of tickets ) {
	try {
		const url = `https://${ host }.zendesk.com/agent/tickets/${ id }`;
		console.log( `checking [${ id }] ${ subject } ${ url }` );
		if ( subject === "[PRODUCTION] App Version Created" || subject.startsWith( "[STAGING]" ) ) {
			console.log( "ticket to close:", id, subject, url );
			await closeAppReviewTicket( id );
		} else if ( subject === "[PRODUCTION] App Version Withdrawn" ) {
			const review = parseReviewTicket( description );
			const cards = await getCardByCustomId( formatReviewId( review.appName, review.version ) );
			if ( cards.length ) {
				const reviewSubject = review.appName + " " + review.version;
				console.log( "discarding:", id, reviewSubject );
				await discardCard( cards[0].id );
			}
			console.log( "ticket to close:", id, subject, url );
			await closeAppReviewTicket( id );
		} else if ( subject === "[PRODUCTION] App Version Submitted" ) {
			const review = parseReviewTicket( description );

			const cards = await getCardByCustomId( formatReviewId( review.appName, review.version ) );
			if ( !cards.length ) {
				const reviewSubject = review.appName + " " + review.version;
				console.log( "review card to create:", id, reviewSubject );
				await createCard( {
					subject: reviewSubject,
					id: formatReviewId( review.appName, review.version  ),
					url,
					review: true,
					description
				} );
			}
			console.log( "ticket to close:", id, subject, url );
			await closeAppReviewTicket( id );
		} else {
			const cards = await getCardByCustomId( formatCustomId( id ) );
			if ( !cards.length ) {
				console.log( "support card to create:", id, subject );
				await createCard( {
					subject,
					id: formatCustomId( id ),
					url,
					description: url
				} );
			}
		}
	} catch ( err ) {
		console.error( err );
	}
}
