public class de_Prompt_BraveAPI {

    @InvocableMethod(label='Search Brave API')
    public static List<Response> getPrompt(List<Request> requests) {
        List<Response> responses = new List<Response>();

        for (Request req : requests) {
            String query = req.inputQuery;

            // Optional site restriction supplied by the caller (e.g. 'https://www.example.com/')
            if (String.isNotBlank(req.siteUrl)) {
                query += ' site:' + extractMainDomain(req.siteUrl);
            }

            HttpRequest httpReq = new HttpRequest();
            // Auth header (X-Subscription-Token) is injected by the Brave_Search_API Named Credential.
            httpReq.setEndpoint('callout:Brave_Search_API/res/v1/web/search?q=' + EncodingUtil.urlEncode(query, 'UTF-8') + '&text_decorations=1&extra_snippets=1&summary=1');
            httpReq.setMethod('GET');
            httpReq.setHeader('Accept', 'application/json');

            Http http = new Http();
            Response res = new Response();

            try {
                HttpResponse httpRes = http.send(httpReq);

                if (httpRes.getStatusCode() == 200) {
                    SearchResponse parsed = (SearchResponse) JSON.deserialize(httpRes.getBody(), SearchResponse.class);
                    res.Prompt = getCollectSearchInfo(parsed);
                } else {
                    res.Prompt = 'API Error: ' + httpRes.getStatus();
                }

            } catch (Exception ex) {
                res.Prompt = 'Exception occurred: ' + ex.getMessage();
            }

            responses.add(res);
        }

        return responses;
    }

    public class Request {
        @InvocableVariable(required=true)
        public String inputQuery;
        @InvocableVariable
        public String siteUrl;
    }

    public class Response {
        @InvocableVariable
        public String Prompt;
    }

    public class SearchResponse {
        public Web web;
    }

    public class Web {
        public List<WebResult> results;
    }

    public class WebResult {
        public String title;
        public String url;
        public String description;
    }

    public static String extractMainDomain(String url) {
        // Extract domain from URL (simple version)
        if (url == null || url == '') return '';
        String domain = url.replace('https://', '').replace('http://', '').split('/')[0];
        return domain;
    }

    public static String getCollectSearchInfo(SearchResponse sr) {
        if (sr == null || sr.web == null || sr.web.results == null || sr.web.results.isEmpty()) {
            return 'No search results found.';
        }

        String summary = '';
        for (WebResult r : sr.web.results) {
            summary += r.title + ' - ' + r.description + ' (' + r.url + ')\n\n';
        }
        return summary;
    }
}