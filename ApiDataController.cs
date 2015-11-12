using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Net.Http;
using System.Web.Http;
using Umbraco.Core;
using Umbraco.Core.Services;
using Umbraco.Web.Mvc;
using Umbraco.Web.WebApi;
using System.Net;
using System.IO;
using Umbraco.Core.Models;
using Newtonsoft.Json;

namespace McTaggart.Controllers
{
    [PluginController("McTaggart")]
    public class TagsApiController : UmbracoAuthorizedApiController
    {

        private readonly string _address = "https://api.thomsonreuters.com/permid/calais";
        private static IContentService _cs = ApplicationContext.Current.Services.ContentService;

        [HttpPost]
        public HttpResponseMessage GetTags([FromBody] ContentObject Content)
        {           
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(_address);

            req.ContentType = "text/html";
            req.Headers.Add("X-AG-Access-Token", Content.ApiKey);
            req.Headers.Add("outputFormat", "application/json");
            req.Headers.Add("omitOutputtingOriginalText", "true");
            req.Method = "POST";

            List<string> tags = new List<string>();

            try
            {
                byte[] bytes = Encoding.UTF8.GetBytes(Content.StringToTag);

                req.ContentLength = bytes.Length;
                Stream os = req.GetRequestStream();
                os.Write(bytes, 0, bytes.Length);
                os.Close();

                WebResponse resp = req.GetResponse();

                if (resp != null)
                {
                    Stream s = null;
                    s = resp.GetResponseStream();
                    StreamReader sr = new StreamReader(s);

                    var jObject = JsonConvert.DeserializeObject<dynamic>(sr.ReadToEnd().Trim());

                    foreach (var o in jObject)
                    {
                        var val = o.Value;

                        if (val["_typeGroup"] != null && (val._typeGroup == "socialTag" || val._typeGroup == "entities"))
                        {
                            tags.Add(val.name.Value);
                        }
                    }
                }
            }
            catch (Exception e)
            {
                return Response(e);
            }

            return Response(tags);
        }

        [HttpPost]
        public HttpResponseMessage PostTags([FromBody] TagsObject Tags)
        {
            IContent node = _cs.GetById(Convert.ToInt32(Tags.Id));
            node.SetTags(TagCacheStorageType.Csv, Tags.Alias, Tags.Tags, true);
            return Response(Tags.Tags.Length);
        }

        public HttpResponseMessage Response(object o)
        {
            HttpResponseMessage response = Request.CreateResponse(HttpStatusCode.OK, o);
            response.Content = (HttpContent)new StringContent(JsonConvert.SerializeObject(o), Encoding.UTF8, "application/json");
            return response;
        }

    }

    public class ContentObject
    {
        public string ApiKey { get; set; }
        public string StringToTag { get; set; }
    }

    public class TagsObject
    {
        public string[] Tags { get; set; }
        public int Id { get; set; }
        public string Alias { get; set; }
    }
}
