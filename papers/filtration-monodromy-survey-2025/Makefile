.PHONY: all clean survey original

all: survey original

survey: main.pdf
original: original-note.pdf

main.pdf: main.tex
	xelatex -interaction=nonstopmode main.tex
	xelatex -interaction=nonstopmode main.tex

original-note.pdf: original-note.tex
	xelatex -interaction=nonstopmode original-note.tex
	xelatex -interaction=nonstopmode original-note.tex

clean:
	rm -f main.aux main.log main.out main.toc
	rm -f original-note.aux original-note.log original-note.out original-note.toc
