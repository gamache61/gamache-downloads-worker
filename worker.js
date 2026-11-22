import { DurableObject } from "cloudflare:workers";

const GITHUB_OWNER = "gamache61";
const GITHUB_REPO = "MyAppDownloads";
const DAYS_ALLOWED = 30;
const MAX_DEVICES = 2;
const SUPPORT_EMAIL = "gamacheapps@gmail.com";

// Gamache PDF's store: PDF id -> Stripe price. 25% off (coupon) when 5 or more PDFs.
const PDF_PRICES = {
  pretrip: "price_1UePagH5ItCgVsLGwXcvNlpZ",
  airbrake: "price_1UePahH5ItCgVsLG0jj3abLr",
  hos: "price_1UePaiH5ItCgVsLGqOLRl9tc",
  tdg: "price_1UePaiH5ItCgVsLGvGJPim3k",
  axle: "price_1UePajH5ItCgVsLGJw84qNeT"
, launch:"price_1UeQpuH5ItCgVsLGyq5vQnpn", pricing:"price_1UeQpvH5ItCgVsLGyxa5zlCp", tracker:"price_1UeQpvH5ItCgVsLGUYvBbAWQ", social:"price_1UeQpwH5ItCgVsLGgHFBln0W", productlaunch:"price_1UeQpxH5ItCgVsLG4C56Mh7H", budget:"price_1UeQpyH5ItCgVsLGdobYTpOy", meals:"price_1UeQpzH5ItCgVsLGaeJH9bnf", roadtrip:"price_1UeQq0H5ItCgVsLGqCFFvZSG", goals:"price_1UeQq0H5ItCgVsLGdM2HulAG", home:"price_1UeQq1H5ItCgVsLGgRZQW4Vx", invoice:"price_1UeRC8H5ItCgVsLG6FhCg2ev", onboarding:"price_1UeRC9H5ItCgVsLG0eNsZOhK", weekly:"price_1UeRC9H5ItCgVsLGKaa5SP5N", feedback:"price_1UeRCAH5ItCgVsLG7F5eRhJZ", startup:"price_1UeRCBH5ItCgVsLG5nvSGWfq", habits:"price_1UeRCCH5ItCgVsLGbvwDCuiL", moving:"price_1UeRCCH5ItCgVsLGNZsfbSYJ", emergency:"price_1UeRCDH5ItCgVsLGg1tOGjd8", holiday:"price_1UeRCEH5ItCgVsLGZo8guYJD", jobsearch:"price_1UeRCFH5ItCgVsLGnEAntUqk", meeting:"price_1UeRNMH5ItCgVsLGNhaKJDSi", project:"price_1UeRNNH5ItCgVsLGZtG3lxlU", quarterly:"price_1UeRNOH5ItCgVsLGm470E0M4", inventory:"price_1UeRNPH5ItCgVsLGC2T0anNv", marketing:"price_1UeRNQH5ItCgVsLGUXC3bcBs", chores:"price_1UeRNRH5ItCgVsLGxx3z7RiV", workout:"price_1UeRNSH5ItCgVsLG0TI3Dh7G", garden:"price_1UeRNSH5ItCgVsLGGecZGGET", savings:"price_1UeRNTH5ItCgVsLGyxMN4C1c", pet:"price_1UeRNUH5ItCgVsLGgS66gwD8", timesheet:"price_1UeRdWH5ItCgVsLGloiZDV4D", leads:"price_1UeRdXH5ItCgVsLGCIzDM81N", mileage:"price_1UeRdYH5ItCgVsLG6tp5Qsvu", sop:"price_1UeRdZH5ItCgVsLGRqCzjX0S", yearend:"price_1UeRdZH5ItCgVsLGq12zJieo", planner:"price_1UeRdaH5ItCgVsLGeoBBaZPb", gratitude:"price_1UeRdbH5ItCgVsLGJHz6GkxW", recipes:"price_1UeRdcH5ItCgVsLGsZ9reyaF", party:"price_1UeRdcH5ItCgVsLGH3hB8AQt", inventoryhome:"price_1UeRddH5ItCgVsLG0ojDjIiz", pelevatorpitchworksheet:"price_1UeRreH5ItCgVsLGJ75mDyCU", pbrandstyleguideworksheet:"price_1UeRrfH5ItCgVsLGhohcnafT", pcustomerpersonaworksheet:"price_1UeRrfH5ItCgVsLG9kuTHJe7", pwebsitelaunchchecklist:"price_1UeRrgH5ItCgVsLGRes4qOcs", psocialmediaauditchecklist:"price_1UeRrhH5ItCgVsLGBCP9cLhE", pbusinessnamebrainstorm:"price_1UeRriH5ItCgVsLGv6h7xOq8", pswotanalysisworksheet:"price_1UeRrjH5ItCgVsLGb7l20z3m", pquarterlybusinessreview:"price_1UeRrkH5ItCgVsLGsQaP6Iqn", punpaidinvoicetracker:"price_1UeRrkH5ItCgVsLGQBChkWcG", pfreelancerratecalculator:"price_1UeRrlH5ItCgVsLGAyX9rNHM", pclientcontactdirectory:"price_1UeRrmH5ItCgVsLGHselcBFA", pbusinessinsurancereviewcheckli:"price_1UeRrnH5ItCgVsLG1HLo4hws", phiringinterviewscorecard:"price_1UeRrnH5ItCgVsLGzuQUt6Ny", pperformancereviewform:"price_1UeRroH5ItCgVsLG23J9RxLa", pjobdescriptiontemplate:"price_1UeRrpH5ItCgVsLG0bok1neP", pmeetingactiontracker:"price_1UeRrqH5ItCgVsLG9ZprfKYD", ptimeblockingplanner:"price_1UeRrqH5ItCgVsLG2A0RKcNn", pdailybusinesschecklist:"price_1UeRrrH5ItCgVsLGjKyZgjpZ", pretailopeningclosingchecklist:"price_1UeRrsH5ItCgVsLGXBOLSiDK", pcraftfairchecklist:"price_1UeRrtH5ItCgVsLGkmHSriuz", pproductcostpricingsheet:"price_1UeRruH5ItCgVsLGCaIHBBSu", psubscriptionandsoftwaretracker:"price_1UeRuXH5ItCgVsLG0pztfpv8", pexpensereceiptlog:"price_1UeRuXH5ItCgVsLGvKva3MHy", pordertrackinglog:"price_1UeRuYH5ItCgVsLGmQF8DGTP", psuppliercomparisonsheet:"price_1UeRuZH5ItCgVsLG5RqYAWbr", pcustomercomplaintlog:"price_1UeRuaH5ItCgVsLGmTmCWhLa", preturnsandrefundslog:"price_1UeRubH5ItCgVsLGdyFlmJvE", preferralprogramplanner:"price_1UeRucH5ItCgVsLGjQ5o6xT5", ppromotionandsaleplanner:"price_1UeRudH5ItCgVsLGUHaWyFhc", pyearlycontentcalendar:"price_1UeRueH5ItCgVsLGk6q4BZWj", pvideoplanner:"price_1UeRueH5ItCgVsLGAEtSmwAx", ppodcastepisodeplanner:"price_1UeRufH5ItCgVsLGUDn9HWx0", pappideavalidationworksheet:"price_1UeRugH5ItCgVsLGMg2MfTA8", pappstorelaunchchecklist:"price_1UeRuhH5ItCgVsLG8ecPIKRu", pbugandfeaturerequestlog:"price_1UeRuiH5ItCgVsLGbexApevh", pbetatesterfeedbackform:"price_1UeRuiH5ItCgVsLGKr18R6VA", pproductroadmapplanner:"price_1UeRujH5ItCgVsLG5E4B1DJL", pokrworksheet:"price_1UeRukH5ItCgVsLGBs1uDb60", pweeklyreviewworksheet:"price_1UeRulH5ItCgVsLGNBAEE4nm", pannualbusinessplanner:"price_1UeRumH5ItCgVsLG79Nwezzn", pnetworkingeventtracker:"price_1UeRumH5ItCgVsLGPRjdDsEE", pfollowupplanner:"price_1UeRunH5ItCgVsLGf6YMmLR5", psidehustleideaplanner:"price_1UeRuoH5ItCgVsLGaNwLLtyV", ponlinestoresetupchecklist:"price_1UeRupH5ItCgVsLGUIoJqEPu", pdailycashsalesreport:"price_1UeRuqH5ItCgVsLGya2m4La6", pannualbudgetoverview:"price_1UeRw7H5ItCgVsLGDgNKWhPT", pbillpaymentcalendar:"price_1UeRw8H5ItCgVsLGtR6tftj1", pweeklyexpensetracker:"price_1UeRw9H5ItCgVsLGYZP84APQ", pnetworthworksheet:"price_1UeRw9H5ItCgVsLGv633HxMN", pcreditcardpayoffplanner:"price_1UeRwAH5ItCgVsLGAbWNEWVX", pgrocerybudgettracker:"price_1UeRwBH5ItCgVsLGdk8b7xsV", psavingschallenge52week:"price_1UeRwCH5ItCgVsLGEvmojUML", pweddingplanningchecklist:"price_1UeRwDH5ItCgVsLGZ43DMh6I", pbabypreparationchecklist:"price_1UeRwDH5ItCgVsLGNUaUs2Yk", phomebuyingchecklist:"price_1UeRwEH5ItCgVsLGH67UH4xp", papartmenthuntingchecklist:"price_1UeRwFH5ItCgVsLGhnuCDlAZ", pcarmaintenancelog:"price_1UeRwGH5ItCgVsLGZxTjTmhS", pcarbuyingchecklist:"price_1UeRwGH5ItCgVsLGIPIwjSDK", pwintercarkitchecklist:"price_1UeRwHH5ItCgVsLGhp9EqVpz", pcampingtripchecklist:"price_1UeRwIH5ItCgVsLG1KHWzhD7", pfishingtripplanner:"price_1UeRwJH5ItCgVsLG0tbLYGrR", phikingdaytripchecklist:"price_1UeRwKH5ItCgVsLGSB1DUKhN", pvacationpackinglist:"price_1UeRwKH5ItCgVsLGNI0ASdLS", pkidschoreandrewardchart:"price_1UeRwLH5ItCgVsLGE7yffFsg", pkidsallowancetracker:"price_1UeRwMH5ItCgVsLGyRf9SSq3", preadinglog:"price_1UeRwNH5ItCgVsLGPE6RzdRi", pbookwishlistandreview:"price_1UeRwNH5ItCgVsLGBh8ELf7j", pmovienightwatchlist:"price_1UeRwOH5ItCgVsLGUChW1kre", pdailyjournalprompts30:"price_1UeRwPH5ItCgVsLGmlISZbuD", pmorningeveningroutineplanner:"price_1UeRwQH5ItCgVsLG1Tkej3zO", pwaterandsleeptracker:"price_1UeRwRH5ItCgVsLGY638qWwE", pmealprepplanner:"price_1UeRwSH5ItCgVsLGNkSt8Ikf", pweeklydinnerrotation:"price_1UeRwTH5ItCgVsLGAiYmXcsJ", pstudyplanner:"price_1UeRwTH5ItCgVsLG3RZj9zOl", pexamrevisiontimetable:"price_1UeRwUH5ItCgVsLG7RJxNZwy", planguagelearningtracker:"price_1UeRwVH5ItCgVsLG4zgglfhn", pskillpracticelog:"price_1UeRwWH5ItCgVsLGwo7KSiXx", pphotographyshotlist:"price_1UeRwWH5ItCgVsLGfN7xjNd9", pcraftprojectplanner:"price_1UeRwXH5ItCgVsLGZM6G7SJx", phomerenovationplanner:"price_1UeRwYH5ItCgVsLGwjPKQUNU", proommakeoverplanner:"price_1UeRwZH5ItCgVsLGMaZsySSc", pdeclutterchallenge30day:"price_1UeRwaH5ItCgVsLG0FHXgBYf", pspringcleaningchecklist:"price_1UeRwaH5ItCgVsLGz91ewV9L", pgarageorganizationchecklist:"price_1UeRwbH5ItCgVsLGkxaNg76J", pyardworkseasonalplanner:"price_1UeRwcH5ItCgVsLGqAlkWyp5", pholidaycardaddresslist:"price_1UeRwdH5ItCgVsLGTgfKOIpF", pbirthdayandanniversarytracker:"price_1UeRweH5ItCgVsLGIeyi2kEI", pgiftideastracker:"price_1UeRweH5ItCgVsLGs7aT0ZD5", pimportantdocumentslocator:"price_1UeRwfH5ItCgVsLGhsIu7DFe", phouseholdinfosheet:"price_1UeRwgH5ItCgVsLGYtQ4UUYs", pbusinessplanoutline:"price_1UeRwhH5ItCgVsLG53GgUiDK", pcompetitoranalysisworksheet:"price_1UeRwhH5ItCgVsLGHeXS1EDW", pemployeeonboardingchecklist:"price_1UeRwiH5ItCgVsLGiP2Y61t4", pemailnewsletterplanner:"price_1UeRwjH5ItCgVsLGwKgj3OcW", pcashflowtracker:"price_1UeRwkH5ItCgVsLGq3rjoE1N", ppantryinventory:"price_1UeRwlH5ItCgVsLGCHo74qfw", pweeklycleaningschedule:"price_1UeRwlH5ItCgVsLGOqcNbBWm", ptravelitineraryplanner:"price_1UeRwmH5ItCgVsLGB8AdKiHa", pkidsweeklyschedule:"price_1UeRwnH5ItCgVsLGMF6TKQvP", pbucketlistanddreamplanner:"price_1UeRwoH5ItCgVsLGWUEF2BTU", pjobestimateform:"price_1UeSgvH5ItCgVsLGwPPGxboZ", pmaterialstakeofflist:"price_1UeSgwH5ItCgVsLG8kXVp80e", pworkorderform:"price_1UeSgxH5ItCgVsLG49AkUxbm", ptoolequipmentinventory:"price_1UeSgyH5ItCgVsLGlt7ao3yO", pjobsitesafetychecklist:"price_1UeSgzH5ItCgVsLGml4EahDV", ptoolboxtalklog:"price_1UeSh0H5ItCgVsLGilXIOkUb", pchangeorderlog:"price_1UeSh0H5ItCgVsLG1dCqLrck", psubcontractortracker:"price_1UeSh1H5ItCgVsLGmq4ykt2b", pprojectpunchlist:"price_1UeSh2H5ItCgVsLGXUa0Pd1i", pjobcosttracker:"price_1UeSh3H5ItCgVsLGG8VOcuT9", pequipmentmaintenancelog:"price_1UeSh4H5ItCgVsLGX1cIKylI", pcustomerjobsignoff:"price_1UeSh5H5ItCgVsLGUUIDm0VZ", prentpaymentledger:"price_1UeSh5H5ItCgVsLGAJwNYruv", ptenantapplicationchecklist:"price_1UeSh6H5ItCgVsLGqCGZLRr8", pmoveinmoveoutinspection:"price_1UeSh7H5ItCgVsLGt2bsUZYQ", pmaintenancerequestlog:"price_1UeSh8H5ItCgVsLGdPrHYFWp", prentalpropertyexpensetracker:"price_1UeSh9H5ItCgVsLGr0AQ5q99", pleasekeydatestracker:"price_1UeShAH5ItCgVsLGSnfH9qY0", ppropertyshowingchecklist:"price_1UeShBH5ItCgVsLGcMurpH9E", prentersmoveinchecklist:"price_1UeShBH5ItCgVsLGUgBJ5v12", proommateexpensesplit:"price_1UeShCH5ItCgVsLGrboDSsWf", prentalunitturnoverchecklist:"price_1UeShDH5ItCgVsLGahlyMYkK", ppethealthrecord:"price_1UeShEH5ItCgVsLGESQnq5OV", ppetfeedingschedule:"price_1UeShFH5ItCgVsLGROof6YXe", pdogtraininglog:"price_1UeShGH5ItCgVsLGtcRnrn4S", ppetsittinginstructions:"price_1UeShHH5ItCgVsLGbMqb1ePn", ppetexpensetracker:"price_1UeShHH5ItCgVsLG65Icwhld", pnewpetchecklist:"price_1UeShIH5ItCgVsLGguNdfC2h", ppetvetvisitlog:"price_1UeShJH5ItCgVsLGvPHWE254", paquariummaintenancelog:"price_1UeShKH5ItCgVsLGKDBBOiYL", plessonplantemplate:"price_1UeShLH5ItCgVsLGeCVuPtdG", pweeklylessonplanner:"price_1UeShMH5ItCgVsLGrrD7znHr", pstudentgradetracker:"price_1UeShNH5ItCgVsLGJsiQS92W", pattendancerecord:"price_1UeShNH5ItCgVsLGnSLJpQVD", phomeschoolschedule:"price_1UeShOH5ItCgVsLGvkZ9U0oN", phomeschoolportfoliolog:"price_1UeShPH5ItCgVsLGEtE8dDpI", pparentteacherconferencenotes:"price_1UeShQH5ItCgVsLGXKh1fhtg", pclassroomsupplychecklist:"price_1UeShRH5ItCgVsLGDvZv07ks", preadingprogresstracker:"price_1UeShSH5ItCgVsLGzjmuGVg2", pschoolyearplanner:"price_1UeShSH5ItCgVsLGSuuTZYfV", pcaregiverdailylog:"price_1UeSiGH5ItCgVsLGw2OBO5yr", pmedicationschedulesheet:"price_1UeSiHH5ItCgVsLGkpSRyUva", pmedicalappointmentlog:"price_1UeSiIH5ItCgVsLGPg6U7hE8", pcarecontactssheet:"price_1UeSiJH5ItCgVsLGLyFFBoap", pseniorhomesafetychecklist:"price_1UeSiKH5ItCgVsLGF5e6AHvi", pcaregivershifthandoff:"price_1UeSiKH5ItCgVsLGMfWwWRN7", phospitalstaychecklist:"price_1UeSiLH5ItCgVsLGRx5liaLs", pquestionsforthedoctor:"price_1UeSiMH5ItCgVsLGCo2Ldh6R", ppracticeplantemplate:"price_1UeSiNH5ItCgVsLGGCWjzd45", pteamrostercontacts:"price_1UeSiNH5ItCgVsLGVpyBZqMK", pgamestatssheet:"price_1UeSiOH5ItCgVsLGP92hlRmq", pseasonscheduletracker:"price_1UeSiPH5ItCgVsLGsKefJPlg", pteamfundraisingtracker:"price_1UeSiQH5ItCgVsLG2S7LeGPw", ptournamentchecklist:"price_1UeSiRH5ItCgVsLGOk2RDIIH", pplayerskillsevaluation:"price_1UeSiRH5ItCgVsLGnoCZ2FNo", pcarpoolschedule:"price_1UeSiSH5ItCgVsLGXMqRyNcy", pvolunteerschedule:"price_1UeSiTH5ItCgVsLGS0v4jP06", peventsignupsheet:"price_1UeSiUH5ItCgVsLGHsGukZjW", pclubmeetingminutes:"price_1UeSiUH5ItCgVsLGx8Taf46u", pdonationlog:"price_1UeSiVH5ItCgVsLGO847cIhD", pfundraisingeventplanner:"price_1UeSiWH5ItCgVsLGVXBvzPdQ", pmembershiproster:"price_1UeSiXH5ItCgVsLGAQKgMLPC", pclubbudgettracker:"price_1UeSiXH5ItCgVsLGBo4FB28V", pvolunteerhourslog:"price_1UeSiYH5ItCgVsLGyFb4OOAS", ptaxdocumentchecklist:"price_1UeSiZH5ItCgVsLG6QAkALI6", pdeductibleexpenseslog:"price_1UeSiaH5ItCgVsLGtinXOPVW", pyearlyfilingtracker:"price_1UeSibH5ItCgVsLGtgQjFuSI", pcharitabledonationslog:"price_1UeSjYH5ItCgVsLGlIhrRJxM", pmedicalexpenselog:"price_1UeSjZH5ItCgVsLGcmvQFsGK", phomeofficeexpenseworksheet:"price_1UeSjaH5ItCgVsLGY1u1eSY0", preceiptorganizerchecklist:"price_1UeSjbH5ItCgVsLGubZo9ma8", precordsretentionguide:"price_1UeSjcH5ItCgVsLGSAsaXvgL", pvisionboardplanner:"price_1UeSjcH5ItCgVsLG88xFfGjB", pyearlygoalsplanner:"price_1UeSjdH5ItCgVsLGSDeAZrhX", pmonthlyplanner:"price_1UeSjeH5ItCgVsLGO0hb3cTP", pdailyplannerpage:"price_1UeSjfH5ItCgVsLG2p2eLP1I", pdecisionmakerworksheet:"price_1UeSjgH5ItCgVsLGqbjyjki8", pprojectbraindump:"price_1UeSjgH5ItCgVsLGlzE0X8tv", plifebalancewheel:"price_1UeSjhH5ItCgVsLGI5S9zwYg", pprioritiesmatrix:"price_1UeSjiH5ItCgVsLG4GJHOpIy", pappfeaturespecsheet:"price_1UeSjjH5ItCgVsLGaozp80Pj", puserstoryplanner:"price_1UeSjkH5ItCgVsLGgMFxQHao", pappreleasenoteslog:"price_1UeSjkH5ItCgVsLGvqkFhpgy", psupportrequestlog:"price_1UeSjlH5ItCgVsLGaKYJ6cXg", pworkoutplanner12week:"price_1UeSjmH5ItCgVsLGFbxvdLys", pstepsandactivitylog:"price_1UeSjnH5ItCgVsLGtS2qB18E", pmealandwaterjournal:"price_1UeSjoH5ItCgVsLGZuLbj0xi", psleeproutinechecklist:"price_1UeSjoH5ItCgVsLGnjiaxwyW", pweeklywellnessplanner:"price_1UeSjpH5ItCgVsLGBuKmbgQR", phabitstackingworksheet:"price_1UeSjqH5ItCgVsLGgNCOAeNC", pdebtsnowballtracker:"price_1UeSjrH5ItCgVsLGkt1CHDq1", psinkingfundstracker:"price_1UeSjsH5ItCgVsLGhHncns37", pmonthlybillschecklist:"price_1UeSjsH5ItCgVsLGjhz7kyOE", pbigpurchaseplanner:"price_1UeSjtH5ItCgVsLGsUomQx85", pprocessimprovementworksheet:"price_1UeSjuH5ItCgVsLGSwy1hZcY", pdailyhuddlesheet:"price_1UeSjvH5ItCgVsLGe0MPBEdU", pdelegationtracker:"price_1UeSjvH5ItCgVsLGB40yoDAD", pquotefollowuptracker:"price_1UeSjwH5ItCgVsLGXtjIT5q8", pcustomerreviewrequesttracker:"price_1UeSjxH5ItCgVsLG8lYKSREx", pclientprojectbrief:"price_1UeSjyH5ItCgVsLGJ2DqohZq"};
const PDF_COUPON = "rCynFhSM";
const PDF_DISCOUNT_MIN = 5;
const PDF_SITE = "https://gamache61.github.io/";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const sid = url.searchParams.get("session_id") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });

    if (url.pathname === "/checkout" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const ids = [...new Set((Array.isArray(body.items) ? body.items : []).map(String))].filter((id) => PDF_PRICES[id]);
      if (!ids.length) return json({ ok: false, error: "Your cart is empty." });
      const ret = String(body.return_url || "");
      const back = ret.startsWith(PDF_SITE) ? ret : PDF_SITE;
      const form = new URLSearchParams();
      form.set("mode", "payment");
      form.set("success_url", `${url.origin}/download?session_id={CHECKOUT_SESSION_ID}`);
      form.set("cancel_url", back);
      ids.forEach((id, i) => {
        form.set(`line_items[${i}][price]`, PDF_PRICES[id]);
        form.set(`line_items[${i}][quantity]`, "1");
      });
      if (ids.length >= PDF_DISCOUNT_MIN) form.set("discounts[0][coupon]", PDF_COUPON);
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${(env.STRIPE_SECRET_KEY || "").trim()}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form
      });
      const s = await res.json().catch(() => ({}));
      if (!res.ok || !s.url) return json({ ok: false, error: "Checkout could not be started. Please try again.", detail: (s.error && s.error.message) || ("Stripe status " + res.status) });
      return json({ ok: true, url: s.url });
    }

    if (url.pathname === "/activate" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const key = String(body.key || "").trim().toUpperCase().replace(/\s+/g, "");
      const app = String(body.app || "").trim().toUpperCase();
      const device = String(body.device || "").slice(0, 80);
      if (!key || !app || !device) return json({ ok: false, error: "Missing key." });
      const r = await store(env).activate(key, app, device, MAX_DEVICES);
      if (r.error === "notfound") return json({ ok: false, error: "That key isn't valid. Check it and try again." });
      if (r.error === "wrongapp") return json({ ok: false, error: "That key is for a different app." });
      if (r.error === "full") return json({ ok: false, error: `This key is already used on ${MAX_DEVICES} devices. Email ${SUPPORT_EMAIL} for help.` });
      if (r.isNew) ctx.waitUntil(notify(env, `Unlocked on a device: ${app}`, [`App: ${app}`, `Key: ${key}`, `Devices on this key: ${r.count} of ${MAX_DEVICES}`, `Device: ${device}`]));
      return json({ ok: true });
    }

    if (url.pathname === "/reset") {
      const pass = url.searchParams.get("pass") || "";
      const admin = (env.ADMIN_PASS || "").trim();
      if (!admin || pass !== admin) return page("Reset", `<p>Not allowed.</p>`, 403);
      const key = (url.searchParams.get("key") || "").trim().toUpperCase();
      const ok = await store(env).reset(key);
      return page("Reset", `<p>${ok ? `Key ${esc(key)} reset. It can be used on ${MAX_DEVICES} new devices.` : "Key not found."}</p>`);
    }

    if (url.pathname === "/download") {
      const result = await checkPurchase(sid, env);
      if (result.error) return page("Download problem", `<p>${esc(result.error)}</p>${help()}`, 403);
      let html = "";
      for (const a of result.apps) {
        const kr = await store(env).keyFor(sid, a.code);
        const key = kr.key;
        if (kr.isNew) ctx.waitUntil(notify(env, `New purchase: ${a.name}`, [`App: ${a.name}`, `Key: ${key}`, `Mode: ${sid.startsWith("cs_live_") ? "LIVE" : "test"}`]));
        html += `<div class="keybox"><p class="small">${esc(a.name)} — your unlock key:</p>
          <p class="key">${esc(key)}</p>
          ${a.url ? `<a class="btn" href="${esc(a.url)}" target="_blank" rel="noopener">Open ${esc(a.name)}</a>` : ""}
          <ol class="steps">
            <li>Click <b>Open ${esc(a.name)}</b>.</li>
            <li>Install it:<br>
              <b>Chrome (computer):</b> ⋮ menu → <b>Cast, save and share</b> → <b>Install page as app</b><br>
              <b>Edge (computer):</b> ⋯ menu → <b>Apps</b> → <b>Install this site as an app</b><br>
              <b>Phone:</b> browser menu → <b>Add to Home Screen</b> (iPhone: Share button → Add to Home Screen)</li>
            <li>Open the installed app, type your key in the box that appears, and click <b>Unlock</b>.</li>
          </ol>
          <p class="small">Works on up to ${MAX_DEVICES} devices. Write your key down or save this page.</p></div>`;
      }
      for (const f of result.files) {
        html += `<a class="btn" href="/file?session_id=${encodeURIComponent(sid)}&f=${encodeURIComponent(f)}">Download ${esc(f)}</a>`;
      }
      return page("Thank you for your purchase!", html + help());
    }

    if (url.pathname === "/file") {
      const f = url.searchParams.get("f") || "";
      const result = await checkPurchase(sid, env);
      if (result.error) return page("Download problem", `<p>${esc(result.error)}</p>${help()}`, 403);
      if (!result.files.includes(f)) return page("Download problem", `<p>That file is not part of this purchase.</p>${help()}`, 403);
      const got = await getFile(f, env);
      if (!got.error) ctx.waitUntil(notify(env, `File downloaded: ${f}`, [`File: ${f}`, `Mode: ${sid.startsWith("cs_live_") ? "LIVE" : "test"}`]));
      if (got.error) return page("Download problem", `<p>The file could not be found.</p><p class="small">${esc(got.error)}</p>${help()}`, 404);
      const isPdf = f.toLowerCase().endsWith(".pdf");
      return new Response(got.body, {
        headers: {
          "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
          "Content-Disposition": `attachment; filename="${f.replace(/"/g, "")}"`,
          "Cache-Control": "no-store"
        }
      });
    }

    if (url.pathname === "/check") {
      const r = await gh(`contents/`, env, "application/vnd.github+json");
      if (!r.ok) return page("Setup check", `<p>GitHub refused (error ${r.status}). The GITHUB_TOKEN may be wrong or expired.</p>`);
      const list = await r.json();
      const names = Array.isArray(list) ? list.map((x) => `${x.name} (${(x.size / 1048576).toFixed(2)} MB)`) : [];
      return page("Setup check", `<p>Files the download program can see:</p><p class="small">${names.map(esc).join("<br>") || "(none)"}</p>
        <p class="small">Unlock keys: ${env.LICENSES ? "ready ✅" : "not set up ❌"}</p>`);
    }

    return page("Gamache Apps", `<p>Nothing here.</p>`, 404);
  }
};

export class Licenses extends DurableObject {
  async keyFor(sid, app) {
    const existing = await this.ctx.storage.get(`s:${sid}:${app}`);
    if (existing) return { key: existing, isNew: false };
    let key;
    do {
      key = `${app}-${rand4()}-${rand4()}`;
    } while (await this.ctx.storage.get(`k:${key}`));
    await this.ctx.storage.put(`k:${key}`, { app, sid, devices: [], created: Date.now() });
    await this.ctx.storage.put(`s:${sid}:${app}`, key);
    return { key, isNew: true };
  }
  async activate(key, app, device, max) {
    const rec = await this.ctx.storage.get(`k:${key}`);
    if (!rec) return { error: "notfound" };
    if (rec.app !== app) return { error: "wrongapp" };
    if (rec.devices.includes(device)) return { ok: true, isNew: false };
    if (rec.devices.length >= max) return { error: "full" };
    rec.devices.push(device);
    await this.ctx.storage.put(`k:${key}`, rec);
    return { ok: true, isNew: true, count: rec.devices.length };
  }
  async reset(key) {
    const rec = await this.ctx.storage.get(`k:${key}`);
    if (!rec) return false;
    rec.devices = [];
    await this.ctx.storage.put(`k:${key}`, rec);
    return true;
  }
}

async function notify(env, subject, lines) {
  const k = (env.RESEND_API_KEY || "").trim();
  if (!k) return;
  const when = new Date().toLocaleString("en-CA", { timeZone: "America/Vancouver" });
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Gamache Apps <onboarding@resend.dev>",
        to: [(env.NOTIFY_EMAIL || SUPPORT_EMAIL).trim()],
        subject,
        text: [...lines, `Time: ${when} (Vancouver)`].join("\n")
      })
    });
  } catch (e) {}
}

function store(env) {
  return env.LICENSES.get(env.LICENSES.idFromName("all"));
}

function rand4() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(b, (x) => chars[x % chars.length]).join("");
}

function stripeKeyFor(sid, env) {
  if (typeof sid === "string" && sid.startsWith("cs_test_")) return (env.STRIPE_TEST_SECRET_KEY || "").trim();
  if (typeof sid === "string" && sid.startsWith("cs_live_")) return (env.STRIPE_SECRET_KEY || "").trim();
  return (env.STRIPE_SECRET_KEY || "").trim();
}

async function stripeGet(path, env, sid) {
  const first = stripeKeyFor(sid, env);
  const second = first === (env.STRIPE_TEST_SECRET_KEY || "").trim() ? (env.STRIPE_SECRET_KEY || "").trim() : (env.STRIPE_TEST_SECRET_KEY || "").trim();
  let res = await fetch(`https://api.stripe.com${path}`, { headers: { Authorization: `Bearer ${first}` } });
  if (res.ok) return await res.json();
  if (second && second !== first) {
    const res2 = await fetch(`https://api.stripe.com${path}`, { headers: { Authorization: `Bearer ${second}` } });
    if (res2.ok) return await res2.json();
    return await res.json().catch(() => ({}));
  }
  return await res.json().catch(() => ({}));
}

async function checkPurchase(sid, env) {
  if (/^pi_[A-Za-z0-9]+$/.test(sid)) {
    const list = await stripeGet("/v1/checkout/sessions?limit=1&payment_intent=" + sid, env, sid);
    const found = list?.data?.[0];
    if (!found?.id) return { ok: false, error: "No Checkout Session found for that Payment" };
    sid = found.id;
  }
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return { ok: false, error: "session ID is not valid" };
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price.product`,
    { headers: { Authorization: `Bearer ${stripeKeyFor(sid, env)}` } }
  );
  if (!res.ok) return { error: "We couldn't find this purchase." };
  const s = await res.json();
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required")
    return { error: "This payment hasn't been completed." };
  if ((Date.now() / 1e3 - s.created) / 86400 > DAYS_ALLOWED) return { error: "This link has expired. Email us with your receipt." };
  const files = [], apps = [];
  for (const item of (s.line_items && s.line_items.data) || []) {
    const prod = (item.price && item.price.product) || {};
    const meta = (typeof prod === "object" && prod.metadata) || {};
    const code = String(meta.app || meta.App || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (code) {
      if (!apps.some((a) => a.code === code))
        apps.push({ code, name: prod.name || item.description || "Your app", url: String(meta.app_url || "").trim() });
      continue;
    }
    (meta.file || meta.File || "").split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => files.includes(x) || files.push(x));
  }
  if (!files.length && !apps.length) return { error: "No app is attached to this product." };
  return { files, apps };
}

function gh(path, env, accept) {
  return fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${path}`, {
    headers: {
      Authorization: `Bearer ${(env.GITHUB_TOKEN || "").trim()}`,
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gamache-downloads"
    }
  });
}

async function getFile(f, env) {
  const path = "contents/" + f.split("/").map(encodeURIComponent).join("/");
  const info = await gh(path, env, "application/vnd.github+json");
  if (!info.ok) return { error: `GitHub said ${info.status} for "${f}".` };
  const meta = await info.json();
  if (!meta || !meta.sha) return { error: `"${f}" is not a file.` };
  const blob = await gh(`git/blobs/${meta.sha}`, env, "application/vnd.github.raw");
  if (blob.ok) return { body: blob.body };
  if (meta.download_url) {
    const d = await fetch(meta.download_url, { headers: { "User-Agent": "gamache-downloads" } });
    if (d.ok) return { body: d.body };
    return { error: `GitHub said ${blob.status}/${d.status} for "${f}".` };
  }
  return { error: `GitHub said ${blob.status} for "${f}".` };
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(obj) {
  return new Response(JSON.stringify(obj), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors() } });
}

function help() {
  return `<p class="small">Need help? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`;
}

function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function page(title, body, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#0f1720;color:#e8eef5;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
.card{background:#1a2532;border-radius:14px;padding:28px;max-width:480px;width:100%;text-align:center;box-shadow:0 8px 30px #0006}
h1{font-size:1.4rem;margin:0 0 12px}
.btn{display:block;margin:12px 0;padding:14px;background:#2f8cff;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;word-break:break-word}
.btn:hover{background:#1f74e0}
.keybox{background:#0f1720;border-radius:12px;padding:16px;margin:14px 0}
.key{font-family:ui-monospace,Consolas,monospace;font-size:1.6rem;letter-spacing:2px;margin:6px 0 10px;user-select:all;color:#ffd166}
.steps{text-align:left;margin:10px 0 0;padding-left:22px;line-height:1.6}
.small{font-size:.85rem;opacity:.75;margin-top:14px}
a{color:#7fb8ff}
</style></head><body><div class="card"><h1>${esc(title)}</h1>${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}
