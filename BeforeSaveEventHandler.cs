using System;
using System.Linq;
using System.Text.RegularExpressions;
using Umbraco.Core;
using Umbraco.Core.Events;
using Umbraco.Core.Models;
using Umbraco.Core.Services;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace McTaggart.Events
{
    /// <summary>
    /// Performs actions that are required before document save.
    /// </summary>
    public class BeforeSaveEventHandler : ApplicationEventHandler
    {
        protected override void ApplicationStarted(UmbracoApplicationBase umbracoApplication, ApplicationContext applicationContext)
        {
            ContentService.Saving += Document_Saving;
        }

        /// <summary>
        /// Event Handler that gets hit before an item is Saved. 
        /// </summary>
        void Document_Saving(IContentService sender, SaveEventArgs<IContent> e)
        {
            try
            {
                IContent doc = e.SavedEntities.First();

                foreach (var propertyType in doc.PropertyTypes)
                {
                    if (propertyType.PropertyEditorAlias == "NW.McTaggart") {
                        var prop = doc.Properties.Where(p => p.Alias == propertyType.Alias).First();
                        var tagArray = JsonConvert.DeserializeObject<List<string>>(prop.Value.ToString()).ToArray();                        
                        doc.SetTags(TagCacheStorageType.Csv, propertyType.Alias, tagArray, false);
                        prop.Value = String.Join(",", tagArray);
                    }
                }
            }
            catch (Exception ex)
            {
                // error? let's swallow it...
            }
        }     
    }
}