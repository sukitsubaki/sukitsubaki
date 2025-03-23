A personal collection of terminal commands and shortcuts that I find useful but tend to forget. This document serves as my go-to resource when I need to recall specific command line operations for development and system management tasks. This reference will grow over time as I discover new useful commands worth remembering.

- [PyPi Publishing](#pypi-publishing)
- [Archiving](#archiving)
- [File and Directory](#file-and-directory)

## PyPI Publishing
1. Update `setup.py`, `pyproject.toml`, `repository/__init__.py`, `README.md`
2. `cd path/to/repository/`
3. Create distribution packages with:
```python
python -m pip install --upgrade pip
python -m pip install --upgrade build
python -m build
```
3. Check packages with Twine:
```python
python -m pip install --upgrade twine
python -m twine check dist/*
```
4. Upload packages to PyPI:
```python
python -m twine upload dist/*
```
5. Enter API token

## Archiving
| Command                                       | Description                            |
| ----------------------------------------------| -------------------------------------- |
| `tar -czvf "$(basename $(pwd)).tar.gz" .`     | Archive current directory              |
| `tar -czvf archive.tar.gz .`                  | Archive current directory with rename  |
| `tar -xzvf archive.tar.gz`                    | Extract archive in current directory   |
| `tar -xzvf archive.tar.gz -C /path/to/target` | Extract archive to different directory |
| `zip -r "$(basename $(pwd)).zip" .`           | Archive current directory              |
| `zip -r custom_name.zip .`                    | Archive current directory with rename  |
| `unzip archive.zip`                           | Extract archive in current directory   |
| `unzip archive.zip -d /path/to/target`        | Extract archive to different directory |

## File and Directory
### Flags
| Command           | Description                           |
| ----------------- | ------------------------------------- |
| `-rn`, `rf`, etc. | Combine multiple flags                |
| `-n`              | Don't overwrite anything (no-clobber) |
| `-f`              | Force overwrite (force)               |
| `-r`              | Get all subdirectories (recursive)    |
| `-i`              | Prompt before overwrite something     |
| `-v`              | Verbose                               |

### Copy, Move, Rename, Create, Delete
| Command                                              | Description                               |
| ---------------------------------------------------- | ----------------------------------------- |
| `cp filename /path/to/destination/`                  | Copy file to another directory            |
| `cp -r directory/ /path/to/destination/`             | Copy directory to another location        |
| `mv filename /path/to/destination/`                  | Move file to another directory            |
| `mv directory/ /path/to/destination/`                | Move directory to another location        |
| `mv oldname.txt newname.txt`                         | Rename file                               |
| `mv olddirectory/ newdirectory/`                     | Rename directory                          |
| `cp/mv oldname.txt /path/to/destination/newname.txt` | Rename file by copy/move                  |
| `cp/mv oldname/ /path/to/destination/newname/`       | Rename directory by copy/move             |
| `touch filename`                                     | Create new file                           |
| `mkdir directory/`                                   | Create new directory                      |
| `rm filename`                                        | Delete file                               |
| `rm -r directory/`                                   | Delete directory                          |
| `rm directory/*`                                     | Delete files in directory                 |
| `rm -r directory/*`                                  | Delete files and directories in directory |
