#include <stdio.h>
#define DEBUG 1
#define NIVEL 3
#if DEBUG
#define LOG(x) printf("log %d\n", x)
#else
#define LOG(x)
#endif
#ifdef NO_EXISTE
#define V 1
#elif NIVEL > 2 && !defined(OTRA)
#define V 2
#else
#define V 3
#endif
#undef DEBUG
#ifndef DEBUG
#define W 9
#endif
int main() { LOG(V); printf("%d %d\n", V, W); return 0; }
