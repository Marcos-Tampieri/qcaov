#!/bin/bash

read -r -p "Enter the QCADesigner folder path relative to this script: " QCA_DIR

if [ ! -d "$QCA_DIR" ]; then
    echo "Error: Directory '$QCA_DIR' does not exist."
    exit 1
fi

python3 - "$QCA_DIR" << 'EOF'
import sys
import os

qca_dir = sys.argv[1]

def update_file(relative_path, old_block, new_block):
    target_path = os.path.join(qca_dir, relative_path)
    
    # Handle filename discrepancy if needed (callback.c vs callbacks.c)
    if not os.path.exists(target_path):
        if relative_path == "src/callback.c" and os.path.exists(os.path.join(qca_dir, "src/callbacks.c")):
            target_path = os.path.join(qca_dir, "src/callbacks.c")
        else:
            print(f"[Error] Target file not found: {target_path}")
            return

    with open(target_path, "r", encoding="utf-8") as f:
        content = f.read()

    if old_block in content:
        content = content.replace(old_block, new_block, 1)
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[Success] Updated {target_path}")
    elif new_block in content:
        print(f"[Info] {target_path} is already up to date.")
    else:
        print(f"[Warning] Original code block not found in {target_path}")

# 1. Update src/main.c
main_old = """  if (argc >= 2)
    file_operations ((GtkWidget *)argv[1], (gpointer)FILEOP_CMDLINE) ;"""

main_new = """  if (argc >= 2)
    file_operations ((GtkWidget *)argv[1], (gpointer)FILEOP_CMDLINE) ;
  if (argc == 4)
  {
    if (strcmp(argv[2], "-o") == 0)
    {
      on_start_simulation_menu_item_activate (NULL, NULL) ;
      on_save_output_to_file_menu_item_activate (NULL, NULL, argv[3]) ;
      exit (0);
    }
  }"""

update_file("src/main.c", main_old, main_new)

# 2. Update src/callbacks.h
callbacks_h_old = """void on_save_output_to_file_menu_item_activate (GtkMenuItem *menuitem, gpointer user_data);"""
callbacks_h_new = """void on_save_output_to_file_menu_item_activate (GtkMenuItem *menuitem, gpointer user_data, char *file_name);"""

update_file("src/callbacks.h", callbacks_h_old, callbacks_h_new)

# 3. Update src/callback.c
callback_c_old = """void on_save_output_to_file_menu_item_activate(GtkMenuItem *menuitem, gpointer user_data)
  {
  static char *pszFName = NULL ;
  char *pszTempFName = NULL ;
  SIMULATION_OUTPUT sim_output = {NULL} ;

  sim_output.sim_data = project_options.sim_data ;
  sim_output.bus_layout = project_options.design->bus_layout ;
  sim_output.bFakeIOLists = FALSE ;
  DBG_CB_HERE (fprintf (stderr, "Entering on_save_output_to_file_menu_item_activate\\n")) ;

  if (NULL == project_options.sim_data) { gdk_beep () ; return ; }

  if (NULL == (pszTempFName = get_file_name_from_user (GTK_WINDOW (main_window.main_window), _("Save Simulation Results"), pszFName, TRUE)))
    return ;

  if (NULL != pszFName) g_free (pszFName) ;

  pszFName = pszTempFName ;

  create_simulation_output_file (pszFName, &sim_output) ;
  }"""

callback_c_new = """void on_save_output_to_file_menu_item_activate(GtkMenuItem *menuitem, gpointer user_data, char *file_name)
  {
  static char *pszFName = NULL ;
  char *pszTempFName = NULL ;
  SIMULATION_OUTPUT sim_output = {NULL} ;

  sim_output.sim_data = project_options.sim_data ;
  sim_output.bus_layout = project_options.design->bus_layout ;
  sim_output.bFakeIOLists = FALSE ;
  DBG_CB_HERE (fprintf (stderr, "Entering on_save_output_to_file_menu_item_activate\\n")) ;

  if (file_name == NULL)
  {
    if (NULL == project_options.sim_data) { gdk_beep () ; return ; }

    if (NULL == (pszTempFName = get_file_name_from_user (GTK_WINDOW (main_window.main_window), _("Save Simulation Results"), pszFName, TRUE)))
      return ;

    if (NULL != pszFName) g_free (pszFName) ;

    pszFName = pszTempFName ;
  }
  else
    pszFName = file_name;

  create_simulation_output_file (pszFName, &sim_output) ;
  }"""

update_file("src/callback.c", callback_c_old, callback_c_new)

EOF