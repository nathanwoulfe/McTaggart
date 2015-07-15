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

        static string _address = "https://api.thomsonreuters.com/permid/calais";
        static IContentService _cs = ApplicationContext.Current.Services.ContentService;

        [HttpGet]
        public HttpResponseMessage GetTags(string apiKey, int id, string props)
        {
            IContent node = _cs.GetById(Convert.ToInt32(id));
            var data = "";
            var propsArr = props.Split(',');

            foreach (var p in propsArr)
            {
                data += node.GetValue(p).ToString();
            }
            
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(_address);

            req.ContentType = "text/raw";
            req.Headers.Add("X-AG-Access-Token", apiKey);
            req.Headers.Add("outputFormat", "application/json");
            req.Method = "POST";

            List<string> tags = new List<string>();

            try
            {
                byte[] bytes = Encoding.UTF8.GetBytes(data);

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

                    dynamic jObject = JsonConvert.DeserializeObject<dynamic>(sr.ReadToEnd().Trim());

                    foreach (var o in jObject)
                    {
                        dynamic val = o.Value;

                        if (val["_typeGroup"] != null && val._typeGroup == "socialTag")
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

        public HttpResponseMessage Response(object o)
        {
            HttpResponseMessage response = Request.CreateResponse(HttpStatusCode.OK, o);
            response.Content = (HttpContent)new StringContent(JsonConvert.SerializeObject(o), Encoding.UTF8, "application/json");
            return response;
        }

    }
}
