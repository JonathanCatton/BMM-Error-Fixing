function main() {
  correctBroadMatchModified()
}

function correctBroadMatchModified() {
  
  //---------------------------------------------------------------------------------------------------------------------------//
  //Options Area/////////////////////////////////////////////////////////////////////////////////////////////////////////
  
  //Enter the URL of a google spreadsheet you'd like to export the changes to
  var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1eC60HT4i3cz3nVtmX4MzsD6zX7So1K0Eaq2bDPT_KbA/edit';
  //Enter the name of the sheet you'd like to export the changes to. Case is important.
  var SHEET_NAME = 'Main'
  
  //Enter the account ID of the account to check
  var accountID = '721-753-2548'; //Av4home
  
  //Change the variable below to NO to turn off report only mode or YES to turn it on.
  var reportOnlyMode = 'YES'
  
  //Working Code Below. ///////////////////////////////////////////////////////////////////////////////////////////////////////
  //-------------------------------------------------------------------------------------------------------------------------//
  

  //Selects active broad match keywords with +s
  var keywordSelector = AdWordsApp 
  .keywords()
  .withCondition("Status = ENABLED")
  .withCondition("AdGroupStatus = ENABLED")
  .withCondition("CampaignStatus = ENABLED")
  .withCondition("KeywordMatchType = BROAD")
  .forDateRange("ALL_TIME")
  .withCondition("Text CONTAINS '\+' ")
  .orderBy("Clicks DESC");

  
  var keywordIterator = keywordSelector.get(); //gets the list of keywords from the selector
  var keywordList = []
    while (keywordIterator.hasNext()) {
      var keyword = keywordIterator.next(); //selects a keyword
      var keywordText = keyword.getText(); //gets the text of the keyword
      
      //Detection of BMM Error section
      var includePlus = keywordText.search("\\+") !== -1 //double check that there is a +
      var notStartsWithPlus = keywordText[0] !== "\+" //check to see if there is no + on the front
      var withoutSpaces = keywordText.replace(/ /g,"") //string without spaces
      var withoutPlus = keywordText.replace(/\+/g,"") //string without +s
      //keywordText.length-withoutPlus.length produces count of plusses same thing with spaces
      //If formatted correctly there should be one more plus than space
      var missingPlus = (keywordText.length - withoutPlus.length)-(keywordText.length - withoutSpaces.length)
      
      //Starts with special case of not starting with a plus. Is special case as it needs an extra step to fix than if the error is anything else
      if (notStartsWithPlus) {
        var matchType = keyword.getMatchType(); //gets keyword Match Type
        var keywordId = keyword.getId(); //gets the keyword id
        var keywordBidding = keyword.bidding(); //gets the bidding details
        var keywordCPC = keywordBidding.getCpc(); //gets the current Max CPC
        var adGroup = keyword.getAdGroup(); //gets the adgroup data which this keyword belongs to
        var adGroupId = adGroup.getId(); //gets the id of the aforementioned adGroup
        var adGroupName = adGroup.getName(); // gets the name of the adgroup
        var campaign = adGroup.getCampaign(); // gets the details of the campaign
        var campaignName = campaign.getName(); // gets the name of the campaign
        
        var correctedBMM = fixBroadMatch(keywordText); //function to correct BMM
        correctedBMM = "\+" + correctedBMM; //Extra step to add + at the start as function doesn't deal with this.
        keywordList.push([keywordText,matchType,correctedBMM,adGroupName,campaignName,adGroupId,keywordId]); //outputs the keyword in an array
        
        Logger.log('Original Keyword = ' + keywordText)
        Logger.log('Corrected Keyword = ' + correctedBMM)
        
        //Check for Report Only Mode
        if (reportOnlyMode != 'YES') {
          //Pauses current faulty keyword
          keyword.pause()
          //Creates new keyword with correct formatting but same bid
          var newkeyword = adGroup.newKeywordBuilder()
          .withText(correctedBMM)
          .withCpc(keywordCPC)
          .build();
        }
        continue; //breaks out of the if case to prevent double triggering
        
        //General case triggered where the difference between spaces and plusses =/= 1
      } else if (missingPlus !== 1) {
        
        var matchType = keyword.getMatchType(); //gets the keyword Match Type
        var keywordId = keyword.getId(); //gets the keyword id
        var keywordBidding = keyword.bidding(); //gets the bidding details
        var keywordCPC = keywordBidding.getCpc(); //gets the current Max CPC
        var adGroup = keyword.getAdGroup(); //gets the adgroup data which this keyword belongs to
        var adGroupId = adGroup.getId(); //gets the id of the aforementioned adGroup
        var adGroupName = adGroup.getName(); // gets the name of the adgroup
        var campaign = adGroup.getCampaign(); // gets the details of the campaign
        var campaignName = campaign.getName(); // gets the name of the campaign
        
        //Correct the broad match to be in the format '+word +word +word'
        var correctedBMM = fixBroadMatch(keywordText); //function to correct BMM
        keywordList.push([keywordText,matchType,correctedBMM,adGroupName,campaignName,adGroupId,keywordId]); //outputs the keyword in an array
        
        Logger.log('Original Keyword = ' + keywordText)
        Logger.log('Corrected Keyword = ' + correctedBMM)
        
        //Check for Report Only Mode
        if (reportOnlyMode != 'YES') {
          //Pause faulty keyword
          keyword.pause()
          //Build new keyword with correct format and same bid
          var newkeyword = adGroup.newKeywordBuilder()
          .withText(correctedBMM)
          .withCpc(keywordCPC)
          .build();
        }
        
      }
      
    }

  //Define headers of spreadsheet (Check ordering matches keyword list)
  var headers = ["Keyword", "Match Type", "Corrected Keyword","AdGroup", "Campaign", "AdGroup Id", "Keyword Id"]; 
  //activate the exporting to spreadsheet function
  writeToSpreadsheet(keywordList,headers,SPREADSHEET_URL,SHEET_NAME)
}


function fixBroadMatch(keywordText) {
  var allSpaces = keywordText.replace(/\+/g," "); //turn all +s into spaces
  var oneSpace = allSpaces.replace(/( )(?=\1)/gi,""); //delete all duplicate spaces (now looks like normal text but with space at front)
  var allSpacePlus = oneSpace.replace(/ /g," \+"); //turn all spaces into a space plus (i.e. "_" --> "_+")
  var correctedBMM = allSpacePlus.replace(/^ /,""); //delete the first character if its a space.
  return(correctedBMM)
}

//exporting to spreadsheet function
function writeToSpreadsheet(keywordList,headers,SPREADSHEET_URL2,SHEET_NAME2,B,errorCheck) {
  var spreadsheet;
  //Open previously created spreadsheet
  spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL2);
  //Select sheet to edit based on name provided
  var sheet = spreadsheet.getSheetByName(SHEET_NAME2);
  //Clear selected sheet
  sheet.clearContents();
  //Add Headers
  sheet.appendRow(headers);
  //Find last row currently in sheet (aka row 1 as the headers are in)
  var lastRow = sheet.getLastRow();
  //select the range sarting from below headers where keywordList.length provides
  //the number of rows needed and keywordList[0].length provides the columns needed
  //only if the list has values to avoid errors
  if (keywordList.length > 0) {
    var range = sheet.getRange(lastRow+1,1,keywordList.length,keywordList[0].length);
    range.setValues(keywordList); //set the range to equal the values extracted from adwords
    Logger.log('Report can be found at ' + SPREADSHEET_URL2)
  } else {
    Logger.log("There were no keywords that required changing")
  }
}
