const WTC_ASSESSMENT_API = (() => {
  async function call(payload) {
    if (!WTC_ASSESSMENT_CONFIG.API_URL || WTC_ASSESSMENT_CONFIG.API_URL.includes('PASTE_')) {
      throw new Error('Assessment API URL is not set in assets/js/assessment-config.js');
    }
    const res = await fetch(WTC_ASSESSMENT_CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await res.json();
  }
  return {
    call,
    submitAIInput: data => call({ action:'submitAIInput', ...data }),
    listAIQueue: () => call({ action:'listAIQueue' }),
    generateAIContent: uploadId => call({ action:'generateAIContent', uploadId }),
    formatGeneratedContent: contentId => call({ action:'formatGeneratedContent', contentId }),
    reviewContent: data => call({ action:'reviewContent', ...data }),
    publishContent: contentId => call({ action:'publishContent', contentId }),
    getFeatureMap: chapterId => call({ action:'getFeatureMap', chapterId }),
    getLesson: lessonId => call({ action:'getLesson', lessonId }),
    getSolutions: solutionSetId => call({ action:'getSolutions', solutionSetId }),
    getMCQ: mcqSetId => call({ action:'getMCQ', mcqSetId }),
    getWorksheet: worksheetSetId => call({ action:'getWorksheet', worksheetSetId })
  };
})();
